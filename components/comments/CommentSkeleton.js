import React from "react";

const CommentSkeleton = () => {
  return (
    <div className="flex gap-3 my-4 animate-pulse">
      {/* Avatar Skeleton */}
      <div className="w-10 h-10 rounded-full bg-gray-300 flex-shrink-0"></div>

      <div className="flex-1 space-y-2">
        {/* Container do Comentário */}
        <div className="bg-gray-200 p-3 rounded-xl">
          {/* Linha do Username */}
          <div className="h-4 bg-gray-300 rounded w-1/4"></div>
          {/* Linhas do Conteúdo */}
          <div className="h-3 bg-gray-300 rounded w-full mt-2"></div>
          <div className="h-3 bg-gray-300 rounded w-3/4 mt-1"></div>
        </div>
        {/* Linha das Ações */}
        <div className="h-4 bg-gray-300 rounded w-1/3 mt-1 ml-2"></div>
      </div>
    </div>
  );
};

export default CommentSkeleton;
