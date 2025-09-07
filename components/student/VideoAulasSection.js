// import React from "react";
// // import { settings } from "config/settings";
// // import { Swiper, SwiperSlide } from "swiper/react";
// // import { Navigation, Pagination } from "swiper/modules";
// import "swiper/css";
// import "swiper/css/navigation";
// import "swiper/css/pagination";
// import Image from "next/image";

// --- Sub-componente para o Card de Vídeo ---
// const VideoCard = ({ video }) => (
//   <a
//     href={`https://www.youtube.com/watch?v=${video.videoId}`}
//     target="_blank"
//     rel="noopener noreferrer"
//     className="block group"
//   >
//     <div className="relative aspect-video rounded-lg overflow-hidden shadow-lg">
//       <Image
//         src={video.thumbnail}
//         alt={video.title}
//         fill
//         style={{ objectFit: "cover" }}
//         className="group-hover:scale-105 transition-transform duration-300"
//       />
//       <div className="absolute inset-0 bg-black/40 group-hover:bg-black/20 transition-colors" />
//     </div>
//     <p className="mt-2 font-semibold text-gray-700 group-hover:text-rakusai-purple transition-colors truncate">
//       {video.title}
//     </p>
//   </a>
// );

// // --- Sub-componente para o Carrossel de uma Coleção ---
// const PlaylistCarousel = ({ collection }) => (
//   <div className="space-y-4">
//     {collection.title && (
//       <h3 className="text-2xl font-bold text-gray-800">{collection.title}</h3>
//     )}
//     {collection.description && (
//       <div
//         className="prose"
//         dangerouslySetInnerHTML={{ __html: collection.description }}
//       />
//     )}

//     <Swiper
//       modules={[Navigation, Pagination]}
//       navigation
//       pagination={{ clickable: true }}
//       spaceBetween={20}
//       slidesPerView={1}
//       breakpoints={{ 640: { slidesPerView: 2 }, 1024: { slidesPerView: 3 } }}
//       className="w-full pb-10 swiper-light-controls"
//     >
//       {collection.videos.map((video, index) => (
//         <SwiperSlide key={index}>
//           <VideoCard video={video} />
//         </SwiperSlide>
//       ))}
//     </Swiper>
//   </div>
// );

// --- Componente Principal com a Lógica Corrigida ---
export default function VideoAulasSection() {
  return <></>;
}

// // --- Função Auxiliar para a API do YouTube ---
// async function processYouTubeLink(link, apiKey) {
//   try {
//     const playlistId = new URL(link).searchParams.get("list");
//     if (playlistId) {
//       console.log(
//         "DEBUG 3: É uma PLAYLIST. Buscando vídeos para o ID:",
//         playlistId,
//       );

//       // É uma playlist
//       const response = await fetch(
//         `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&maxResults=50&playlistId=${playlistId}&key=${apiKey}`,
//       );
//       const data = await response.json();
//       return data.items.map((item) => ({
//         title: item.snippet.title,
//         thumbnail: item.snippet.thumbnails.high.url,
//         videoId: item.snippet.resourceId.videoId,
//       }));
//     } else {
//       // É um vídeo único
//       const videoId = new URL(link).searchParams.get("v");
//       console.log(
//         "DEBUG 3: É um VÍDEO ÚNICO. Buscando informações para o ID:",
//         videoId,
//       );

//       const response = await fetch(
//         `https://www.googleapis.com/youtube/v3/videos?part=snippet&id=${videoId}&key=${apiKey}`,
//       );
//       const data = await response.json();
//       const video = data.items[0];
//       return [
//         {
//           title: video.snippet.title,
//           thumbnail: video.snippet.thumbnails.high.url,
//           videoId: video.id,
//         },
//       ];
//     }
//   } catch (error) {
//     console.error("Erro ao processar link do YouTube:", error);
//     return [];
//   }
// }
