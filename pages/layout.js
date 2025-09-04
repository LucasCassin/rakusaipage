import { texts } from "src/utils/texts";
import { useAuth } from "src/contexts/AuthContext";
import { useView } from "src/contexts/ViewContext.js";
import PublicHeader from "components/PublicHeader";
import StudentHeader from "components/StudentHeader.js";

/**
 * Layout principal da aplicação
 * Inclui header, main content e footer
 */
export default function RootLayout({ children }) {
  // Hook de autenticação para obter o estado de carregamento
  const { user, isLoading } = useAuth();
  const { isPublicView } = useView();

  return (
    <div className="min-h-screen flex flex-col bg-gray-100">
      {/* Header ou indicador de carregamento */}
      {isLoading ? (
        <div className="flex justify-center items-center h-16 bg-gray-800 text-white shadow-md">
          <p className="text-gray-300">{texts.layout.message.loading}</p>
        </div>
      ) : isPublicView || !user ? (
        <PublicHeader />
      ) : (
        <StudentHeader />
      )}

      {/* Conteúdo principal */}
      <main className="flex-1 w-full">{children}</main>

      {/* Footer */}
      <footer className="bg-gray-800 text-white">
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
          <p className="text-center text-gray-400 text-sm">
            {texts.layout.message.copyright}
          </p>
        </div>
      </footer>
    </div>
  );
}
