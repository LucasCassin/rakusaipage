"use client";

import React from "react";

/**
 * Um componente de loader genérico com uma animação de rotação.
 * Usa TailwindCSS para estilização.
 */
export default function Loader() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <div
        className="h-12 w-12 animate-spin rounded-full border-4 border-solid border-blue-600 border-t-transparent"
        role="status"
        aria-label="carregando"
      >
        <span className="sr-only">Carregando...</span>
      </div>
    </div>
  );
}
