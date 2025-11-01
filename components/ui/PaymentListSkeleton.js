import React from "react";

const PaymentListSkeleton = ({ rows = 3 }) => {
  return (
    <div className="space-y-4 animate-pulse">
      {[...Array(rows)].map((_, index) => (
        <div
          key={index}
          className="bg-white p-4 rounded-md shadow-sm flex justify-between items-center"
        >
          <div className="space-y-2">
            <div className="h-4 bg-gray-200 rounded w-24"></div>
            <div className="h-3 bg-gray-200 rounded w-48"></div>
          </div>
          <div className="h-8 bg-gray-200 rounded w-28"></div>
        </div>
      ))}
    </div>
  );
};

export default PaymentListSkeleton;
