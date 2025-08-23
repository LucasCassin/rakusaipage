"use client";

import { useAuth } from "src/contexts/AuthContext";
import { useEffect, useState } from "react";

// Importando os componentes de view
import PublicLandingPage from "./public/PublicLandingPage";
import StudentDashboard from "./student/Dashboard";

// Importando o novo componente de UI
import Loader from "./ui/Loader";

/**
 * Componente controlador que decide qual view exibir (pública ou de aluno)
 * com base no status de autenticação do usuário.
 */
export default function HomeContent() {
  const { user } = useAuth();
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Aguarda a montagem no cliente para evitar inconsistência de renderização.
  // Enquanto isso, exibe um loader genérico.
  if (!isMounted) {
    return <Loader />;
  }

  // Se o usuário existir, mostra o Dashboard. Senão, mostra a Landing Page.
  return user ? <StudentDashboard user={user} /> : <PublicLandingPage />;
}
