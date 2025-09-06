import React from "react";
import Image from "next/image";
import Link from "next/link";

export default function CollectionCard({ collection }) {
  return (
    <Link href={`/video-aulas/${collection.slug}`} className="block group">
      <div className="bg-white rounded-lg shadow-lg overflow-hidden transition-all duration-300 group-hover:shadow-xl group-hover:-translate-y-1">
        <div className="relative w-full aspect-video">
          {collection.thumbnail ? (
            <Image
              src={collection.thumbnail.url}
              alt={collection.thumbnail.description || collection.title}
              fill
              style={{ objectFit: "cover" }}
            />
          ) : (
            <div className="w-full h-full bg-gray-200"></div>
          )}
        </div>
        <div className="p-4">
          <h3 className="text-lg font-bold text-gray-800 truncate">
            {collection.title || "Coleção de Vídeos"}
          </h3>
          <p className="text-sm text-gray-500 mt-1">
            {/* {collection.videos.length}{" "}
            {collection.videos.length === 1 ? "vídeo" : "vídeos"} */}
          </p>
        </div>
      </div>
    </Link>
  );
}
