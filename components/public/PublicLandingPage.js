"use client";

import React, { useState } from "react";
import HeroSection from "./HeroSection";
import SobreSection from "./SobreSection";
import Modal from "../modals/SobreModal.js";

export default function PublicLandingPage({ pageData /*, presentations*/ }) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalContent, setModalContent] = useState({ title: "", content: "" });

  const handleOpenModal = (title, content) => {
    setModalContent({ title, content });
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
  };

  const carouselData = pageData?.homeCarrossel || {};

  return (
    <>
      <Modal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title={modalContent.title}
      >
        {modalContent.content}
      </Modal>

      <main>
        <HeroSection images={carouselData.images || []} />
        <SobreSection pageData={pageData} onOpenModal={handleOpenModal} />
      </main>
    </>
  );
}
