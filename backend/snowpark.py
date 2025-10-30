from snowflake.snowpark import Session
import pandas as pd
from sklearn.ensemble import RandomForestClassifier

# --- Step 1: Connect to Snowflake ---
connection_params = {
    "account": "WMHYTLQ-AU37368",
    "user": "RHYTHMCHHEDA",
    "password": "murtYAK8meZiJCN",
    "warehouse": "COMPUTE_WH",
    "database": "API_RATE_LIMITER",
    "schema": "REQUEST_LOGS"
}

session = Session.builder.configs(connection_params).create()
print("✅ Connected to Snowflake")

# --- Step 2: Load historical request logs ---
df = session.table("REQUESTS").to_pandas()
print(f"Loaded {len(df)} rows from REQUESTS")

if df.empty:
    print("⚠️ No data found in REQUESTS. Add some test rows first.")
    exit()

# --- Step 3: Feature engineering ---
df["hour_of_day"] = pd.to_datetime(df["TIMESTAMP"]).dt.hour
df["day_of_week"] = pd.to_datetime(df["TIMESTAMP"]).dt.dayofweek
df["prev_count"] = df.groupby("USER_ID")["ALLOWED"].shift(1).fillna(0)

X = df[["hour_of_day", "day_of_week", "prev_count"]]
y = df["ALLOWED"]

# --- Step 4: Train a basic model ---
model = RandomForestClassifier(n_estimators=50, random_state=42)
model.fit(X, y)
print("✅ Model trained")

# --- Step 5: Generate predictions ---
df["predicted_allowed"] = model.predict(X)

# --- Step 6: Prepare predictions DataFrame with correct column names ---
predictions_df = df[["TIMESTAMP", "USER_ID", "predicted_allowed"]].copy()

# Convert timestamp to Snowflake TIMESTAMP_NTZ format
predictions_df["TIMESTAMP"] = pd.to_datetime(predictions_df["TIMESTAMP"], errors='coerce')

# Ensure predicted_allowed is boolean and rename to match Go backend
predictions_df["PREDICTED_ALLOWED"] = predictions_df["predicted_allowed"].astype(bool)
predictions_df = predictions_df.drop(columns=["predicted_allowed"])

# --- Step 7: Write predictions to Snowflake ---
session.write_pandas(
    predictions_df,
    table_name="PREDICTIONS",
    auto_create_table=True,
    overwrite=True
)
print("✅ Clean predictions written to PREDICTIONS table")

# --- Step 8: Verify ---
res = session.sql("SELECT * FROM PREDICTIONS LIMIT 5").collect()
print("📊 Sample predictions:")
for row in res:
    print(row)
