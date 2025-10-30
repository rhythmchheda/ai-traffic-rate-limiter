package main

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"strings"
	"time"

	"github.com/redis/go-redis/v9"
	_ "github.com/snowflakedb/gosnowflake"
)

type Prediction struct {
	UserID           string    `json:"user_id"`
	Timestamp        time.Time `json:"timestamp"`
	PredictedAllowed bool      `json:"predicted_allowed"`
}

type APIResponse struct {
	Status  string `json:"status"`
	Message string `json:"message"`
}

var (
	ctx = context.Background()
	rdb *redis.Client
	db  *sql.DB
)

func main() {
	initRedis()
	initSnowflake()
	cacheAllPredictions()

	http.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		log.Println("👉 Received request:", r.Method, r.URL.Path)
		w.Write([]byte(fmt.Sprintf("Path received: %s", r.URL.Path)))
	})

	http.HandleFunc("/api/predict", handleAPI)
	http.HandleFunc("/admin/rate-status", handleAdmin)
	http.HandleFunc("/admin/logs", handleLogs)

	log.Println("🚀 Server running on http://localhost:8080")
	log.Fatal(http.ListenAndServe(":8080", nil))
}

func initRedis() {
	rdb = redis.NewClient(&redis.Options{
		Addr: "localhost:6379",
	})
	_, err := rdb.Ping(ctx).Result()
	if err != nil {
		log.Fatalf("❌ Redis connection failed: %v", err)
	}
	log.Println("✅ Connected to Redis")
}

func initSnowflake() {
	dsn := fmt.Sprintf("%s:%s@%s/%s/%s?warehouse=%s",
		os.Getenv("SNOWFLAKE_USER"),
		os.Getenv("SNOWFLAKE_PASSWORD"),
		os.Getenv("SNOWFLAKE_ACCOUNT"),
		os.Getenv("SNOWFLAKE_DATABASE"),
		os.Getenv("SNOWFLAKE_SCHEMA"),
		os.Getenv("SNOWFLAKE_WAREHOUSE"),
	)
	var err error
	db, err = sql.Open("snowflake", dsn)
	if err != nil {
		log.Fatalf("❌ Snowflake connection failed: %v", err)
	}
	log.Println("✅ Connected to Snowflake")
}

func cacheAllPredictions() {
	query := `
	SELECT "USER_ID", "PREDICTED_ALLOWED"
	FROM "REQUEST_LOGS"."PREDICTIONS"
	WHERE "TIMESTAMP" = (
		SELECT MAX("TIMESTAMP")
		FROM "REQUEST_LOGS"."PREDICTIONS" p2
		WHERE p2."USER_ID" = PREDICTIONS."USER_ID"
	)
	`
	rows, err := db.Query(query)
	if err != nil {
		log.Println("⚠️ Error fetching predictions from Snowflake:", err)
		return
	}
	defer rows.Close()

	count := 0
	for rows.Next() {
		var userID string
		var val bool
		if err := rows.Scan(&userID, &val); err != nil {
			log.Println("⚠️ Row scan error:", err)
			continue
		}

		err := rdb.Set(ctx, fmt.Sprintf("prediction:%s", userID), fmt.Sprintf("%v", val), 10*time.Minute).Err()
		if err != nil {
			log.Println("⚠️ Redis set error:", err)
			continue
		}
		count++
	}
	log.Printf("✅ Cached %d predictions in Redis", count)
}

func handleAPI(w http.ResponseWriter, r *http.Request) {
	enableCORS(&w)

	if r.Method != http.MethodPost {
		http.Error(w, "Only POST allowed", http.StatusMethodNotAllowed)
		return
	}

	userID := r.Header.Get("X-User-ID")
	if userID == "" {
		respondJSON(w, http.StatusBadRequest, APIResponse{"error", "Missing user ID"})
		return
	}

	rateKey := fmt.Sprintf("rate:%s", userID)
	reqCount, _ := rdb.Incr(ctx, rateKey).Result()
	if reqCount == 1 {
		rdb.Expire(ctx, rateKey, 1*time.Minute)
	}
	if reqCount > 5 {
		logRequest(userID, "/api/predict", false)
		respondJSON(w, http.StatusTooManyRequests, APIResponse{"error", fmt.Sprintf("Rate limit exceeded for user %s", userID)})
		return
	}

	allowed := getPredictionCached(userID)
	logRequest(userID, "/api/predict", allowed)

	if allowed {
		respondJSON(w, http.StatusOK, APIResponse{"success", fmt.Sprintf("Request allowed for user %s (AI allowed=%v)", userID, allowed)})
	} else {
		respondJSON(w, http.StatusTooManyRequests, APIResponse{"error", fmt.Sprintf("AI model blocked user %s", userID)})
	}
}

func handleAdmin(w http.ResponseWriter, r *http.Request) {
	enableCORS(&w)

	users, err := rdb.Keys(ctx, "rate:*").Result()
	if err != nil {
		http.Error(w, "Error fetching rate keys", http.StatusInternalServerError)
		return
	}

	status := make([]map[string]interface{}, 0)
	for _, key := range users {
		userID := key[len("rate:"):]
		countStr, _ := rdb.Get(ctx, key).Result()
		count := 0
		fmt.Sscanf(countStr, "%d", &count)
		ttl, _ := rdb.TTL(ctx, key).Result()

		aiVal, _ := rdb.Get(ctx, fmt.Sprintf("prediction:%s", userID)).Result()
		aiAllowed := aiVal == "true" || aiVal == "1"

		status = append(status, map[string]interface{}{
			"user_id":     userID,
			"requests":    count,
			"ai_allowed":  aiAllowed,
			"ttl_seconds": int(ttl.Seconds()),
		})
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(status)
}

// ✅ NEW: Logs API
func handleLogs(w http.ResponseWriter, r *http.Request) {
	enableCORS(&w)

	logs, err := rdb.LRange(ctx, "requests_log", 0, 49).Result()
	if err != nil {
		http.Error(w, "Error fetching logs", http.StatusInternalServerError)
		return
	}

	entries := []map[string]string{}
	for _, entry := range logs {
		parts := strings.Split(entry, ",")
		if len(parts) != 4 {
			continue
		}
		entries = append(entries, map[string]string{
			"timestamp": parts[0],
			"user_id":   parts[1],
			"endpoint":  parts[2],
			"allowed":   parts[3],
		})
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(entries)
}

func enableCORS(w *http.ResponseWriter) {
	(*w).Header().Set("Access-Control-Allow-Origin", "*")
	(*w).Header().Set("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
	(*w).Header().Set("Access-Control-Allow-Headers", "Content-Type, X-User-ID")
}

func getPredictionCached(userID string) bool {
	key := fmt.Sprintf("prediction:%s", userID)
	val, err := rdb.Get(ctx, key).Result()
	if err == redis.Nil || err != nil {
		allowed := getPredictionFromSnowflake(userID)
		rdb.Set(ctx, key, fmt.Sprintf("%v", allowed), 10*time.Minute)
		return allowed
	}
	return val == "true" || val == "1"
}

func getPredictionFromSnowflake(userID string) bool {
	query := `SELECT "PREDICTED_ALLOWED"
			  FROM "REQUEST_LOGS"."PREDICTIONS"
			  WHERE "USER_ID" = ?
			  ORDER BY "TIMESTAMP" DESC
			  LIMIT 1`
	row := db.QueryRow(query, userID)

	var val bool
	if err := row.Scan(&val); err != nil {
		log.Println("⚠️ No prediction found, defaulting to allow:", err)
		return true
	}
	return val
}

func logRequest(userID, endpoint string, allowed bool) {
	entry := fmt.Sprintf("%s,%s,%s,%v", time.Now().Format(time.RFC3339), userID, endpoint, allowed)
	if err := rdb.LPush(ctx, "requests_log", entry).Err(); err != nil {
		log.Println("⚠️ Redis log error:", err)
	}
}

func respondJSON(w http.ResponseWriter, status int, payload APIResponse) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(payload)
}
