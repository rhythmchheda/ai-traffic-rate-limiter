import React, { useEffect, useState } from "react";
import StatCard from "./StatCard";
import TrafficChart from "./TrafficChart";
import axios from "axios";
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

interface UserStatus {
  user_id: string;
  requests: number;
  ai_allowed: boolean;
  ttl_seconds: number;
  last_requests: {
    timestamp: string;
    endpoint: string;
    ai_allowed: boolean;
  }[];
}

export default function Dashboard() {
  const [data, setData] = useState<UserStatus[]>([]);
  const [activityData, setActivityData] = useState<
    { timestamp: string; user_id: string; allowed: boolean }[]
  >([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await axios.get("http://localhost:8080/admin/rate-status");
        setData(res.data);

        const recent = res.data.flatMap((user: UserStatus) =>
          user.last_requests.map((req) => ({
            timestamp: req.timestamp,
            user_id: user.user_id,
            allowed: req.ai_allowed,
          }))
        );

        const sorted = recent.sort(
          (a: { timestamp: string }, b: { timestamp: string }) =>
            new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
        );

        setActivityData(sorted);
      } catch (error) {
        console.error("Error fetching data:", error);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, []);

  const stats = {
    totalUsers: data.length,
    allowed: data.filter((u) => u.ai_allowed).length,
    blocked: data.filter((u) => !u.ai_allowed).length,
  };

  const barData = data.map((u) => ({
    name: u.user_id,
    requests: u.requests,
  }));

  const pieData = [
    { name: "Allowed", value: stats.allowed },
    { name: "Blocked", value: stats.blocked },
  ];

  const COLORS = ["#22c55e", "#ef4444"];

  return (
    <div className="p-6 min-h-screen bg-gray-100">
      <h1 className="text-3xl font-bold text-center mb-8 text-gray-800">
        🚦 AI Rate Limiter Dashboard
      </h1>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <StatCard title="Users" value={stats.totalUsers} />
        <StatCard title="Allowed" value={stats.allowed} color="text-green-600" />
        <StatCard title="Blocked" value={stats.blocked} color="text-red-600" />
      </div>

      {/* Line Chart */}
      <div className="bg-white p-6 rounded-xl shadow mb-10">
        <h2 className="text-xl font-semibold mb-4 text-gray-700">
          Traffic Chart (Allowed/Blocked Over Time)
        </h2>
        <TrafficChart data={activityData} />
      </div>

      {/* Bar Chart */}
      <div className="bg-white p-6 rounded-xl shadow mb-10">
        <h2 className="text-xl font-semibold mb-4 text-gray-700">
          Requests per User
        </h2>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={barData}>
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="requests" fill="#3b82f6" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Pie Chart */}
      <div className="bg-white p-6 rounded-xl shadow mb-10">
        <h2 className="text-xl font-semibold mb-4 text-gray-700">
          Allowed vs Blocked
        </h2>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={pieData}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              outerRadius={100}
              label
            >
              {pieData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index]} />
              ))}
            </Pie>
            <Tooltip />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* User Table and Recent Activity stay the same */}
    </div>
  );
}
