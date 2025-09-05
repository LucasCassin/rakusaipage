import React from "react";
import WelcomeHeader from "./WelcomeHeader";
// Futuramente, importaremos outros componentes aqui, como Comunicados, Playlists, etc.

export default function StudentDashboard({ user, pageData }) {
  // Pega os dados de boas-vindas que vêm da página principal
  const welcomeData = pageData?.alunoBoasVindas;

  return (
    <div className="min-h-screen bg-gray-100 pt-16">
      {/* 1. Mensagem Inicial */}
      <WelcomeHeader user={user} welcomeData={welcomeData} />

      {/* Container para o resto do conteúdo */}
      <main className="max-w-7xl mx-auto py-10 px-4 sm:px-6 lg:px-8">
        {/*
          Aqui entrarão as próximas seções:
          - Comunicados
          - Playlists de Vídeos
          - etc.
        */}
        <div className="bg-white p-8 rounded-lg shadow">
          <h2 className="text-2xl font-bold text-gray-800">Próximas Seções</h2>
          <p className="mt-4 text-gray-600">
            O conteúdo de comunicados e playlists de vídeo aparecerá aqui.
          </p>
        </div>
      </main>
    </div>
  );
}
