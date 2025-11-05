import React from "react";
import StageElement from "./StageElement";

/**
 * Renderiza o "Palco" como um contêiner 'relative' e
 * mapeia todos os 'scene_elements' para o componente 'StageElement'.
 */
export default function FormationMap({ elements = [], loggedInUser }) {
  return (
    <div className="relative w-full min-h-[500px] h-full bg-gray-900 rounded-b-lg overflow-hidden p-4">
      {/* Um "pattern" sutil no fundo, como no seu 'pattern.svg'.
        Isso é opcional, mas dá um visual profissional.
      */}
      <div
        className="absolute inset-0 opacity-5"
        style={{
          backgroundImage: "url(/images/pattern.svg)",
          backgroundSize: "cover",
        }}
      />

      {/* Renderiza os elementos */}
      {elements.map((element) => (
        <StageElement
          key={element.id}
          element={element}
          loggedInUser={loggedInUser}
        />
      ))}

      {elements.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center">
          <p className="text-gray-500">Esta cena (formação) está vazia.</p>
        </div>
      )}
    </div>
  );
}
