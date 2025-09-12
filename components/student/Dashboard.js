import React, { useState, useEffect, useMemo } from "react";
import WelcomeHeader from "./WelcomeHeader";
import ComunicadoModal from "../modals/ComunicadoModal";
import ComunicadosSection from "./ComunicadosSection";
import VideoAulasSection from "./VideoAulasSection";
import CommentsSection from "components/comments/CommentsSection";

export default function StudentDashboard({ user, pageData, comunicados }) {
  const welcomeData = pageData?.alunoBoasVindas;
  const [splashComunicados, setSplashComunicados] = useState([]);
  const [isSplashOpen, setIsSplashOpen] = useState(false);

  // A lógica de filtragem e ordenação agora vive aqui
  const visibleComunicados = useMemo(() => {
    if (!comunicados) return [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return (
      comunicados
        .filter((com) => {
          const isVisibleForUser =
            com.features.length === 0 ||
            com.features.some((feature) => user.features.includes(feature));
          const startDate = new Date(com.startDate);
          const endDate = new Date(com.endDate);
          const isWithinDateRange = startDate <= today && endDate >= today;
          return isVisibleForUser && isWithinDateRange;
        })
        // MUDANÇA: Adicionada a lógica de ordenação para priorizar 'Urgente'
        .sort((a, b) => {
          if (a.subject === "Urgente" && b.subject !== "Urgente") return -1;
          if (a.subject !== "Urgente" && b.subject === "Urgente") return 1;
          return 0; // Mantém a ordem original (por data) para os outros
        })
    );
  }, [comunicados, user.features]);

  useEffect(() => {
    const splashCandidates = visibleComunicados.filter((com) => {
      if (!com.showSplash) return false;
      const isDismissed = localStorage.getItem(
        `dismissComunicado_${com.title}`,
      );
      return !isDismissed;
    });

    if (splashCandidates.length > 0) {
      setSplashComunicados(splashCandidates);
      setIsSplashOpen(true);
    }
  }, [visibleComunicados]);

  const handleDismissSplash = (comunicado) => {
    if (comunicado) {
      localStorage.setItem(`dismissComunicado_${comunicado.title}`, "true");
    }
    const remainingSplashes = splashComunicados.filter(
      (c) => c.title !== comunicado.title,
    );
    setSplashComunicados(remainingSplashes);
    if (remainingSplashes.length === 0) {
      setIsSplashOpen(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 pt-16">
      <ComunicadoModal
        isOpen={isSplashOpen}
        onClose={() => setIsSplashOpen(false)}
        onDismiss={handleDismissSplash}
        comunicados={splashComunicados}
      />

      <WelcomeHeader user={user} welcomeData={welcomeData} />

      <main className="max-w-7xl mx-auto py-10 px-4 sm:px-6 lg:px-8 space-y-12">
        <ComunicadosSection user={user} comunicados={comunicados} />
        <div id="video-aulas">
          <VideoAulasSection />
        </div>

        <CommentsSection videoId={"comentarios-pagina-inicial-student"} />
      </main>
    </div>
  );
}
