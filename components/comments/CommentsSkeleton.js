import React from "react";
import CommentSkeleton from "./CommentSkeleton";

const CommentsSkeleton = ({ count = 3 }) => {
  return (
    <div>
      {[...Array(count)].map((_, index) => (
        <CommentSkeleton key={index} />
      ))}
    </div>
  );
};

export default CommentsSkeleton;
