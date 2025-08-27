"use client";

import React from "react";

// Importando o novo componente HeroSection
import HeroSection from "./HeroSection";

// --- Placeholders para as seções da Landing Page ---
// No futuro, você vai criar cada um destes como um componente separado
// em sua própria pasta, assim como fizemos aqui.

const SobreSection = () => (
  <section className="py-20 bg-white">
    <div className="container mx-auto px-6 text-center">
      <h2 className="text-4xl font-bold mb-6">Sobre o Grupo</h2>
      <p className="text-gray-600 max-w-2xl mx-auto">
        Aqui virá a descrição do grupo Rakusai Taiko, sua história, filosofia e
        paixão pela cultura japonesa.
      </p>
    </div>
  </section>
);

const ApresentacoesSection = () => (
  <section className="py-20 bg-gray-100">
    <div className="container mx-auto px-6 text-center">
      <h2 className="text-4xl font-bold mb-6">Próximas Apresentações</h2>
      <p className="text-gray-600">
        Aqui será exibida a lista de futuros eventos e apresentações.
      </p>
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

export default function PublicLandingPage({ heroImages }) {
  // No futuro, você pode adicionar estados aqui se precisar
  // gerenciar algo que afete múltiplas seções (ex: um tema claro/escuro).

  return (
    <main>
      <HeroSection images={heroImages} />
      <SobreSection />
      <ApresentacoesSection />
      <ContatoSection />
      {/* Adicione outras seções como Galeria, etc., aqui */}
    </main>
  );
}
