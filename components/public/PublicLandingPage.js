"use client";

import React from "react";

// Importando o novo componente HeroSection
import HeroSection from "./HeroSection";

// --- Placeholders para as seções da Landing Page ---
// No futuro, você vai criar cada um destes como um componente separado
// em sua própria pasta, assim como fizemos aqui.

const SobreSection = ({ texto }) => (
  <section className="py-20 bg-white">
    <div className="container mx-auto px-6 text-center">
      <h2 className="text-4xl font-bold mb-6">Sobre o Grupo</h2>
      <p className="text-gray-600 max-w-2xl mx-auto">
        <div dangerouslySetInnerHTML={{ __html: texto }} />
      </p>
    </div>
  </section>
);

const ApresentacoesSection = ({ presentations }) => (
  <section className="py-20 bg-gray-100">
    <div className="container mx-auto px-6 text-center">
      <h2 className="text-4xl font-bold mb-6">Próximas Apresentações</h2>
      <ul>
        {presentations.map((event, index) => (
          <li key={index}>
            {event.title} - {new Date(event.date).toLocaleDateString()}
          </li>
        ))}
      </ul>
    </div>
  </section>
);

const ContatoSection = () => (
  <section className="py-20 bg-white">
    <div className="container mx-auto px-6 text-center">
      <h2 className="text-4xl font-bold mb-6">Contato</h2>
      <p className="text-gray-600">
        Formulário de contato, redes sociais e outras informações.
      </p>
    </div>
  </section>
);

// --- Componente Principal da Landing Page ---

export default function PublicLandingPage({ pageData, presentations }) {
  // Para pegar os dados do carrossel:
  const carouselData = pageData?.homeCarrossel || {};

  // Para pegar a descrição da seção "Sobre":
  const aboutDescriptionHtml = pageData?.homeSobre?.description || "";

  return (
    <main>
      <HeroSection images={carouselData.images} />

      <SobreSection texto={aboutDescriptionHtml} />
      <ApresentacoesSection presentations={presentations} />
      <ContatoSection />

      {/* ... e assim por diante para cada seção ... */}
    </main>
  );
}
