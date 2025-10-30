import React from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

interface TrafficChartProps {
  data: {
    timestamp: string;
    user_id: string;
    allowed: boolean;
  }[];
}

export default function TrafficChart({ data }: TrafficChartProps) {
  if (!data || data.length === 0)
    return <p className="text-gray-500">No traffic data available</p>;

  // Group by time and count allowed vs blocked requests
  const grouped: Record<string, { allowed: number; blocked: number }> = {};
  data.forEach((req) => {
    const t = new Date(req.timestamp).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
    if (!grouped[t]) grouped[t] = { allowed: 0, blocked: 0 };
    req.allowed ? grouped[t].allowed++ : grouped[t].blocked++;
  });

  const chartData = Object.entries(grouped).map(([time, val]) => ({
    time,
    Allowed: val.allowed,
    Blocked: val.blocked,
  }));

  return (
    <div style={{ width: "100%", height: 300 }}>
      <ResponsiveContainer>
        <LineChart data={chartData}>
          <XAxis dataKey="time" />
          <YAxis />
          <Tooltip />
          <Legend />
          <Line
            type="monotone"
            dataKey="Allowed"
            stroke="#16a34a" // green
            strokeWidth={2}
            dot={false}
          />
          <Line
            type="monotone"
            dataKey="Blocked"
            stroke="#dc2626" // red
            strokeWidth={2}
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
