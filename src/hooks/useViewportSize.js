import { useState, useEffect, useCallback } from "react";

export function useViewportSize() {
  const [size, setSize] = useState({
    width: typeof window !== "undefined" ? window.innerWidth : 0,
    height: typeof window !== "undefined" ? window.innerHeight : 0,
  });

  const handleResize = useCallback(() => {
    // PASSO 1 (IMEDIATO):
    // Força o tamanho a ser, no máximo, o tamanho físico da tela do dispositivo.
    // Isso previne que a largura "esticada" do modo paisagem seja usada no recálculo.
    setSize((currentSize) => ({
      width: Math.min(window.screen.width, currentSize.width),
      height: Math.min(window.screen.height, currentSize.height),
    }));

    // PASSO 2 (APÓS UM DELAY):
    // Depois de um pequeno atraso para o navegador se ajustar,
    // medimos o viewport final e correto.
    setTimeout(() => {
      setSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    }, 50); // Um delay curto é suficiente
  }, []);

  useEffect(() => {
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [handleResize]);
  console.log(size);
  return size;
}
