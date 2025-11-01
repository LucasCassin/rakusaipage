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

// --- Função Helper para o Google Analytics ---
const pageview = (url) => {
  if (window.gtag && process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID) {
    window.gtag("config", process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID, {
      page_path: url,
    });
  }
};

/**
 * Componente principal da aplicação
 * Envolve todo o app com o provedor de autenticação e layout comum
 */
function MyApp({ Component, pageProps }) {
  const router = useRouter();

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

      <div className={`${poppins.variable} ${caveat.variable} font-sans`}>
        <AuthProvider>
          <ViewProvider>
            <Layout>
              <FinancialsDashboardProvider>
                <Component {...pageProps} />
              </FinancialsDashboardProvider>
            </Layout>
            <RouteChangeLoading />
          </ViewProvider>
        </AuthProvider>
      </div>
    </>
  );
}

export default MyApp;
