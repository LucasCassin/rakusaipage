import "styles/globals.css";
import { AuthProvider } from "src/contexts/AuthContext.js";
import { ViewProvider } from "src/contexts/ViewContext.js";
import React, { useEffect } from "react";
import Layout from "pages/layout.js";
import RouteChangeLoading from "components/RouteChangeLoading";
import { poppins, caveat } from "src/utils/fonts";
import { FinancialsDashboardProvider } from "src/contexts/FinancialsDashboardContext";
// --- Imports para o Google Analytics ---
import { useRouter } from "next/router";
import Script from "next/script";

// --- (NOVO) Imports para DND Dinâmico ---
import dynamic from "next/dynamic";
import Loader from "components/ui/Loader"; // Usaremos seu loader

// --- (NOVO) Importar o DndProvider dinamicamente ---
// Isso garante que ele e seus 'backends' (HTML5Backend, TouchBackend)
// NUNCA sejam incluídos no 'bundle' do servidor.
const DndProviderWrapper = dynamic(
  () => import("components/DndProviderWrapper"), // O caminho para o novo arquivo
  {
    ssr: false, // A CHAVE: Desabilita a Renderização no Servidor
    loading: () => <Loader />, // Mostra um loader enquanto o cliente hidrata
  },
);

// --- Função Helper para o Google Analytics (Sua função original) ---
const pageview = (url) => {
  if (window.gtag && process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID) {
    window.gtag("config", process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID, {
      page_path: url,
    });
  }
};

/**
 * Componente principal da aplicação
 */
function MyApp({ Component, pageProps }) {
  const router = useRouter();

  // --- (Sua lógica original do Google Analytics) ---
  useEffect(() => {
    if (!process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID) {
      return;
    }

    const handleRouteChange = (url) => {
      pageview(url);
    };

    router.events.on("routeChangeComplete", handleRouteChange);

    return () => {
      router.events.off("routeChangeComplete", handleRouteChange);
    };
  }, [router.events]);

  return (
    <>
      {/* --- (Sua lógica original do Google Analytics Scripts) --- */}
      {process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID && (
        <>
          <Script
            strategy="afterInteractive"
            src={`https://www.googletagmanager.com/gtag/js?id=${process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID}`}
          />
          <Script
            id="google-analytics"
            strategy="afterInteractive"
            dangerouslySetInnerHTML={{
              __html: `
                window.dataLayer = window.dataLayer || [];
                function gtag(){dataLayer.push(arguments);}
                gtag('js', new Date());
                gtag('config', '${process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID}', {
                  page_path: window.location.pathname,
                });
              `,
            }}
          />
        </>
      )}

      {/* --- (Sua estrutura de Providers original) --- */}
      <div className={`${poppins.variable} ${caveat.variable} font-sans`}>
        <AuthProvider>
          <ViewProvider>
            {/* O DndProviderWrapper (client-side only) envolve o Layout */}
            <DndProviderWrapper>
              <Layout>
                <FinancialsDashboardProvider>
                  <Component {...pageProps} />
                </FinancialsDashboardProvider>
              </Layout>
            </DndProviderWrapper>
            <RouteChangeLoading />
          </ViewProvider>
        </AuthProvider>
      </div>
    </>
  );
}

export default MyApp;
