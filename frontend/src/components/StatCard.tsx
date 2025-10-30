import React from "react";

interface StatCardProps {
  title: string;
  value: string | number;
  color?: string; // ✅ Added optional color
}

const StatCard: React.FC<StatCardProps> = ({ title, value, color }) => {
  return (
    <div className="bg-white shadow-md rounded-xl p-6 flex flex-col items-center justify-center text-center">
      <h3 className="text-gray-500 text-lg">{title}</h3>
      <p className={`text-3xl font-bold ${color || "text-blue-600"}`}>{value}</p>
    </div>
  );
};

export default StatCard;
