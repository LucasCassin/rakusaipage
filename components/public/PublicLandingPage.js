"use client";

import React, { useState, useEffect } from "react";
import HeroSection from "./HeroSection";
import SobreSection from "./SobreSection";
import AulasSection from "./AulasSection";
import EventosSection from "./EventosSection";
import ContrateSection from "./ContrateSection";
import ContatoSection from "./ContatoSection";
import Modal from "../modals/SobreModal.js";
import VideoModal from "../modals/VideoModal";
import CountdownModal from "../modals/CountdownModal";
import { getDaysUntilEvent } from "src/utils/dateUtils";

export default function PublicLandingPage({
  pageData,
  presentations,
  horarios,
  tiposEvento,
}) {
  // Estados para o modal de TEXTO
  const [isTextModalOpen, setIsTextModalOpen] = useState(false);
  const [textModalContent, setTextModalContent] = useState({
    title: "",
    content: null,
  });

  // Estados para o modal de VÍDEO
  const [isVideoModalOpen, setIsVideoModalOpen] = useState(false);
  const [activeVideoId, setActiveVideoId] = useState(null);

  const [isCountdownModalOpen, setIsCountdownModalOpen] = useState(false);
  const [countdownEvent, setCountdownEvent] = useState(null);

  useEffect(() => {
    if (presentations && presentations.length > 0) {
      // Encontra o primeiro evento que satisfaz TODAS as condições:
      // 1. Contagem ativada (não é -1)
      // 2. Não foi dispensado pelo usuário (não está no localStorage)
      // 3. Está dentro do período de contagem regressiva
      const eventToShow = presentations.find((event) => {
        const isDismissed = localStorage.getItem(
          `dismissCountdown_${event.title}`,
        );
        const daysUntil = getDaysUntilEvent(event.date);

        return (
          event.showCountdownDays !== -1 &&
          !isDismissed &&
          daysUntil >= 0 &&
          daysUntil <= event.showCountdownDays
        );
      });

      // Se um evento foi encontrado após passar por todas as verificações, mostre o modal.
      if (eventToShow) {
        setCountdownEvent(eventToShow);
        setIsCountdownModalOpen(true);
      }
    }
  }, [presentations]);

  const handleOpenTextModal = (title, descriptionHtml, mapsUrl) => {
    let content = (
      <>
        <div dangerouslySetInnerHTML={{ __html: descriptionHtml }} />
        {mapsUrl && (
          <a href={mapsUrl} target="_blank" rel="noopener noreferrer" /* ... */>
            Ver no Google Maps
          </a>
        )}
      </>
    );
    setTextModalContent({ title, content });
    setIsTextModalOpen(true);
  };

  // Nova função para abrir o MODAL DE VÍDEO
  const handleOpenVideoModal = (videoId) => {
    setActiveVideoId(videoId);
    setIsVideoModalOpen(true);
  };

  // Na função de fechar o modal
  const handleDismissForever = () => {
    if (countdownEvent) {
      localStorage.setItem(`dismissCountdown_${countdownEvent.title}`, "true");
    }
    setIsCountdownModalOpen(false);
  };
  const carouselData = pageData?.homeCarrossel || {};

  return (
    <>
      <CountdownModal
        isOpen={isCountdownModalOpen}
        onClose={() => setIsCountdownModalOpen(false)}
        onDismissForever={handleDismissForever}
        event={countdownEvent}
      />

      <Modal
        isOpen={isTextModalOpen}
        onClose={() => setIsTextModalOpen(false)}
        title={textModalContent.title}
      >
        {textModalContent.content}
      </Modal>

      <VideoModal
        isOpen={isVideoModalOpen}
        onClose={() => setIsVideoModalOpen(false)}
        videoId={activeVideoId}
      />

      <main>
        <HeroSection images={carouselData.images || []} />
        <SobreSection pageData={pageData} onOpenModal={handleOpenTextModal} />
        <AulasSection pageData={pageData} horarios={horarios} />
        <EventosSection
          pageData={pageData}
          presentations={presentations}
          onOpenTextModal={handleOpenTextModal}
          onOpenVideoModal={handleOpenVideoModal}
        />
        <ContrateSection pageData={pageData} tiposEvento={tiposEvento} />
        <ContatoSection pageData={pageData} />
      </main>
    </>
  );
}
