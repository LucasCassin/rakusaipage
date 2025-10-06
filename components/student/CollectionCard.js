import React from "react";
import Image from "next/image";
import Link from "next/link";
import Button from "components/ui/Button"; // Importando o botão

export default function CollectionCard({ collection, defaultURL }) {
  const videoCount = collection.videos?.length || 0;
  const videoText = videoCount === 1 ? "vídeo" : "vídeos";

  return (
    <div className="bg-white rounded-tl-[2rem] rounded-br-[2rem] rounded-tr-md rounded-bl-md shadow-lg overflow-hidden transition-all duration-300 hover:shadow-2xl hover:-translate-y-1 flex flex-col">
      {/* Container da Imagem */}
      <Link href={`/${defaultURL}/${collection.slug}`} className="block group">
        <div className="relative w-full h-0 pb-[100%]">
          {collection.thumbnail ? (
            <Image
              src={collection.thumbnail.url}
              alt={collection.thumbnail.description || collection.title}
              fill
              style={{ objectFit: "cover" }}
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
              className="absolute top-0 left-0 w-full h-full"
            />
          ) : (
            <div className="absolute top-0 left-0 w-full h-full bg-gray-200"></div>
          )}
        </div>
      </Link>

      {/* Container do Conteúdo (Título, Contagem e Botão) */}
      <div className="p-5 flex flex-col flex-grow">
        <h3 className="text-xl font-bold text-gray-800">
          {collection.title || "Coleção de Vídeos"}
        </h3>

        {videoCount > 0 && (
          <p className="text-sm text-gray-500 mt-1">
            {videoCount} {videoText}
          </p>
        )}

        {/* O botão agora fica no final do card, usando o espaço restante */}
        <div className="mt-auto pt-4">
          <Link href={`/${defaultURL}/${collection.slug}`} legacyBehavior>
            <a className="block">
              <Button variant="primary" size="small" className="w-full">
                Acessar Aulas
              </Button>
            </a>
          </Link>
        </div>
      </div>
    </div>
  );
}
