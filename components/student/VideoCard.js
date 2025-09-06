import React from "react";
import Image from "next/image";

export default function VideoCard({ video, onClick, isActive }) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left p-2 rounded-lg transition-colors flex items-start gap-3 ${isActive ? "bg-rakusai-purple/10" : "hover:bg-gray-100"}`}
    >
      <div className="relative w-24 h-14 rounded-md overflow-hidden flex-shrink-0">
        <Image
          src={video.thumbnail}
          alt={video.title}
          fill
          style={{ objectFit: "cover" }}
          sizes="100px"
        />
      </div>
      <div className="flex-grow">
        <p
          className={`font-semibold text-sm leading-tight ${isActive ? "text-rakusai-purple" : "text-gray-800"}`}
        >
          {video.title}
        </p>
      </div>
    </button>
  );
}
