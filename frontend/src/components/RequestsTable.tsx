import React from "react";

interface RequestsTableProps {
  data: any[];
}

const RequestsTable: React.FC<RequestsTableProps> = ({ data }) => {
  return (
    <div className="text-gray-500">
      {data && data.length > 0 ? (
        <ul>
          {data.map((req, index) => (
            <li key={index}>
              {req.user_id || "Unknown User"} — {req.status || "N/A"} —{" "}
              {req.timestamp || "N/A"}
            </li>
          ))}
        </ul>
      ) : (
        "Recent requests will appear here"
      )}
    </div>
  );
};

export default RequestsTable;
