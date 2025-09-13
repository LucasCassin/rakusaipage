import React, { useState, useEffect } from "react";
import { FaHeart, FaRegHeart } from "react-icons/fa";
import Spinner from "components/ui/Spinner";

const LikeButton = ({ isLiked, likeCount, onClick, disabled, isLoading }) => {
  const [isAnimating, setIsAnimating] = useState(false);

  // useEffect "escuta" por mudanças na prop isLiked
  useEffect(() => {
    // Se o novo estado é 'curtido', ativa a animação.
    if (isLiked) {
      setIsAnimating(true);
      const timer = setTimeout(() => setIsAnimating(false), 300); // Duração da animação
      return () => clearTimeout(timer);
    }
  }, [isLiked]); // Roda toda vez que 'isLiked' muda

  return (
    <button
      onClick={onClick}
      disabled={disabled || isLoading}
      className="flex items-center justify-center gap-1.5 p-1 rounded-md hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      style={{ minWidth: "45px" }}
      aria-label="Curtir"
    >
      {isLoading ? (
        <Spinner size="4" color="text-gray-500" />
      ) : (
        <>
          <span
            className={`transform transition-transform duration-300 ease-out ${isAnimating ? "scale-150" : "scale-100"}`}
          >
            {isLiked ? <FaHeart className="text-red-500" /> : <FaRegHeart />}
          </span>
          <span>{likeCount}</span>
        </>
      )}
    </button>
  );
};

export default LikeButton;
