import React from "react";
import Dashboard from "./components/Dashboard";

const App = () => {
  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <Dashboard />   {/* ✅ remove “data={data}” */}
    </div>
  );
};

export default App;
