import React from "react";

const SkeletonCard = () => (
  <div className="bg-white p-4 rounded-lg shadow-md border border-gray-200 animate-pulse">
    <div className="flex justify-between items-start">
      <div>
        <div className="h-5 w-32 bg-gray-300 rounded mb-2"></div>
        <div className="h-4 w-48 bg-gray-200 rounded"></div>
      </div>
      <div className="h-8 w-24 bg-gray-300 rounded"></div>
    </div>
    <div className="mt-4 flex flex-wrap gap-2">
      <div className="h-6 w-20 bg-gray-200 rounded-full"></div>
      <div className="h-6 w-24 bg-gray-200 rounded-full"></div>
    </div>
    <div className="mt-4 border-t pt-3 text-sm text-gray-400">
      <div className="h-3 w-40 bg-gray-200 rounded"></div>
    </div>
  </div>
);

export default function UserListSkeleton({ count = 3 }) {
  return (
    <div className="space-y-4 mt-8">
      {Array.from({ length: count }).map((_, index) => (
        <SkeletonCard key={index} />
      ))}
    </div>
  );
}
