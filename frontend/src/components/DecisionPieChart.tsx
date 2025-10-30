// src/components/DecisionPieChart.tsx
import React from "react";
import {
  PieChart,
  Pie,
  Tooltip,
  Cell,
  ResponsiveContainer,
  Legend,
} from "recharts";

interface DecisionPieChartProps {
  allowed: number;
  blocked: number;
}

export default function DecisionPieChart({
  allowed,
  blocked,
}: DecisionPieChartProps) {
  const data = [
    { name: "Allowed", value: allowed },
    { name: "Blocked", value: blocked },
  ];
  const COLORS = ["#22c55e", "#ef4444"];

  return (
    <div className="h-80 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            outerRadius={100}
            label
            dataKey="value"
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index]} />
            ))}
          </Pie>
          <Tooltip />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
