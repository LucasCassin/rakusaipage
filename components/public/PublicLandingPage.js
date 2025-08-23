"use client";

import React from "react";

// --- Placeholders para as seções da Landing Page ---
// No futuro, você vai criar cada um destes como um componente separado
// em sua própria pasta, assim como fizemos aqui.

const HeroSection = () => (
  <section className="flex items-center justify-center h-screen bg-gray-900 text-white">
    <div className="text-center">
      <h1 className="text-5xl font-bold">Rakusai Taiko</h1>
      <p className="mt-4 text-xl">A força e a alma da batida japonesa</p>
    </div>
  </section>
);

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

export default function PublicLandingPage() {
  // No futuro, você pode adicionar estados aqui se precisar
  // gerenciar algo que afete múltiplas seções (ex: um tema claro/escuro).

  return (
    <main>
      <HeroSection />
      <SobreSection />
      <ApresentacoesSection />
      <ContatoSection />
      {/* Adicione outras seções como Galeria, etc., aqui */}
    </main>
  );
}
