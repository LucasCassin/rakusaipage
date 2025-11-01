import React from "react";

const UserFinancialsSkeleton = () => {
  return (
    <div className="mt-6 border-t border-gray-200 pt-6 animate-pulse">
      {/* Skeleton do SubscriptionDetails */}
      <div className="bg-white p-6 rounded-lg border border-gray-200">
        <div className="h-5 bg-gray-300 rounded w-1/3 mb-4"></div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-6">
          <div className="space-y-1">
            <div className="h-3 bg-gray-200 rounded w-1/2"></div>
            <div className="h-4 bg-gray-300 rounded w-3/4"></div>
          </div>
          <div className="space-y-1">
            <div className="h-3 bg-gray-200 rounded w-1/2"></div>
            <div className="h-4 bg-gray-300 rounded w-3/4"></div>
          </div>
          <div className="space-y-1">
            <div className="h-3 bg-gray-200 rounded w-1/2"></div>
            <div className="h-4 bg-gray-300 rounded w-3/4"></div>
          </div>
        </div>
      </div>

      {/* Skeleton do PaymentHistoryList */}
      <div className="mt-6">
        <div className="h-5 bg-gray-300 rounded w-1/4 mb-4"></div>
        <div className="space-y-3">
          <div className="bg-white p-4 rounded-md border border-gray-200 h-16"></div>
          <div className="bg-white p-4 rounded-md border border-gray-200 h-16"></div>
        </div>
      </div>
    </div>
  );
};

export default UserFinancialsSkeleton;
