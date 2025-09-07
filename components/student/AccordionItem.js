import React from "react";
// import Image from "next/image";
// import { ChevronDownIcon } from "@heroicons/react/24/solid";
// import VideoPlayer from "./VideoPlayer";
// import { settings } from "config/settings";

export default function AccordionItem() {
  // const [isOpen, setIsOpen] = useState(false);

  // // Lógica para verificar se o usuário tem acesso a esta coleção
  // const userHasAccess = useMemo(() => {
  //   if (!collection.niveis || collection.niveis.length === 0) return true;

  //   const nivelOrder = {
  //     iniciante: 0,
  //     intermediario: 1,
  //     avancado: 2,
  //     admin: 3,
  //   };
  //   let userMaxNiveis = { taiko: -1, fue: -1 };

  //   if (user.features) {
  //     settings.nivel.taiko.forEach((n) => {
  //       if (user.features.includes(n.feature) && n.ord > userMaxNiveis.taiko)
  //         userMaxNiveis.taiko = n.ord;
  //     });
  //     settings.nivel.fue.forEach((n) => {
  //       if (user.features.includes(n.feature) && n.ord > userMaxNiveis.fue)
  //         userMaxNiveis.fue = n.ord;
  //     });
  //   }

  //   return collection.niveis.some((nivelFeature) => {
  //     const [_, mod, niv] = nivelFeature.split(":");
  //     const requiredOrd = nivelOrder[niv];
  //     const userOrd = userMaxNiveis[mod];
  //     return userOrd >= requiredOrd;
  //   });
  // }, [collection, user.features]);

  // if (!userHasAccess) {
  //   return null;
  // }

  // return (
  //   <div className="bg-white rounded-lg shadow-md overflow-hidden transition-all duration-300">
  //     <button
  //       className="w-full p-4 flex items-center justify-between text-left hover:bg-gray-50 transition-colors"
  //       onClick={() => setIsOpen(!isOpen)}
  //     >
  //       <div className="flex items-center gap-4">
  //         {collection.thumbnail && (
  //           <div className="relative w-28 h-20 rounded-md overflow-hidden flex-shrink-0">
  //             <Image
  //               src={collection.thumbnail.url}
  //               alt={collection.thumbnail.description || collection.title}
  //               fill
  //               style={{ objectFit: "cover" }}
  //               sizes="112px"
  //             />
  //           </div>
  //         )}
  //         <div className="flex-grow">
  //           <h3 className="text-xl font-bold text-gray-800">
  //             {collection.title || "Coleção de Vídeos"}
  //           </h3>
  //           <p className="text-gray-500 text-sm">
  //             {collection.videos.length} vídeo(s)
  //           </p>
  //         </div>
  //       </div>
  //       <ChevronDownIcon
  //         className={`w-6 h-6 text-gray-400 transition-transform duration-300 ${isOpen ? "rotate-180" : ""}`}
  //       />
  //     </button>

  //     {isOpen && (
  //       <div className="p-6 border-t animate-fade-in">
  //         {collection.description && (
  //           <div
  //             className="prose mb-6"
  //             dangerouslySetInnerHTML={{ __html: collection.description }}
  //           />
  //         )}
  //         <VideoPlayer collection={collection} />
  //       </div>
  //     )}
  //   </div>
  // );
  return <></>;
}
