import React, { createContext, useContext, useState, useEffect } from "react";

// 1. Criar o Contexto
const ViewContext = createContext();

// 2. Criar o "Provedor" do Contexto
export function ViewProvider({ children }) {
  // O estado 'view' pode ser 'public' ou 'student'
  const [view, setView] = useState("public"); // Começa como público por padrão

  // Efeito para carregar a última visualização salva no localStorage
  useEffect(() => {
    const savedView = localStorage.getItem("appView");
    if (savedView) {
      setView(savedView);
    }
  }, []);

  const switchToPublic = () => {
    setView("public");
    localStorage.setItem("appView", "public");
  };

  const switchToStudent = () => {
    setView("student");
    localStorage.setItem("appView", "student");
  };

  const value = {
    view,
    switchToPublic,
    switchToStudent,
    isPublicView: view === "public",
    isStudentView: view === "student",
  };

  return <ViewContext.Provider value={value}>{children}</ViewContext.Provider>;
}

// 3. Criar o Hook customizado para usar o contexto facilmente
export const useView = () => {
  return useContext(ViewContext);
};
