import React from "react";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { TouchBackend } from "react-dnd-touch-backend";

// Função Helper para detectar 'touch'
const isTouchDevice = () => {
  if (typeof window === "undefined") return false;
  return (
    "ontouchstart" in window ||
    navigator.maxTouchPoints > 0 ||
    navigator.msMaxTouchPoints > 0
  );
};

/**
 * Este componente "Wrapper" SÓ É RENDERIZADO NO CLIENTE.
 * Ele determina com segurança qual backend (Touch ou HTML5) usar
 * e fornece o DndProvider para seus filhos.
 */
export default function DndProviderWrapper({ children }) {
  // Como este componente só roda no cliente (graças ao next/dynamic),
  // podemos checar 'isTouchDevice' com segurança.
  const backend = isTouchDevice() ? TouchBackend : HTML5Backend;

  return <DndProvider backend={backend}>{children}</DndProvider>;
}
