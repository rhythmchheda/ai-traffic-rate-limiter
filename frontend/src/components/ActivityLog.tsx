import React, { useEffect, useState } from "react";
import axios from "axios";

interface LogEntry {
  timestamp: string;
  user_id: string;
  endpoint: string;
  allowed: string;
}

const ActivityLog: React.FC = () => {
  const [logs, setLogs] = useState<LogEntry[]>([]);

  const fetchLogs = async () => {
    try {
      const res = await axios.get("http://localhost:8080/admin/logs");
      setLogs(res.data);
    } catch (err) {
      console.error("Error fetching logs:", err);
    }
  };

  useEffect(() => {
    fetchLogs();
    const interval = setInterval(fetchLogs, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="bg-white shadow-md rounded-xl p-6 mt-8">
      <h2 className="text-xl font-semibold mb-4 text-gray-700">Recent Activity</h2>
      <div className="max-h-80 overflow-y-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-200">
              <th className="p-2">Timestamp</th>
              <th className="p-2">User ID</th>
              <th className="p-2">Endpoint</th>
              <th className="p-2">Allowed</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((log, index) => (
              <tr key={index} className="border-t">
                <td className="p-2">{new Date(log.timestamp).toLocaleTimeString()}</td>
                <td className="p-2">{log.user_id}</td>
                <td className="p-2">{log.endpoint}</td>
                <td
                  className={`p-2 font-semibold ${
                    log.allowed === "true" ? "text-green-600" : "text-red-600"
                  }`}
                >
                  {log.allowed === "true" ? "Yes" : "No"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ActivityLog;
