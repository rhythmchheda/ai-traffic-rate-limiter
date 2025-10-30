// src/components/RequestsBarChart.tsx
import React from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface RequestsBarChartProps {
  data: { user_id: string; requests: number }[];
}

export default function RequestsBarChart({ data }: RequestsBarChartProps) {
  return (
    <div className="h-80 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="user_id" />
          <YAxis />
          <Tooltip />
          <Bar dataKey="requests" fill="#60a5fa" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
