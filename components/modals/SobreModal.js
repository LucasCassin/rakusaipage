import React from "react";

export default function Modal({ isOpen, onClose, title, children }) {
  if (!isOpen) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-80 z-50 flex items-center justify-center p-4 animate-fade-in"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg shadow-xl w-[95vw] max-w-6xl max-h-[90vh] relative flex flex-col font-sans"
        onClick={(e) => e.stopPropagation()}
      >
        {/* MUDANÇA: Cabeçalho com o gradiente da marca */}
        <header className="flex items-center justify-between p-4 rounded-t-lg bg-gradient-to-r from-rakusai-purple via-rakusai-pink to-rakusai-yellow-dark">
          <h2 className="text-2xl font-bold text-white">{title}</h2>
          <button
            onClick={onClose}
            className="text-white opacity-70 hover:opacity-100 text-4xl transition-opacity"
          >
            &times;
          </button>
        </header>

        <main className="p-6 overflow-y-auto">
          <div className="prose lg:prose-xl max-w-none prose-h1:font-sans prose-h2:font-sans prose-p:text-justify">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
