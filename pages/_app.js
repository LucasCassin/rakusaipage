import "styles/globals.css";
import { AuthProvider } from "src/contexts/AuthContext.js";
import { ViewProvider } from "src/contexts/ViewContext.js";
import React from "react";
import Layout from "pages/layout.js";
import RouteChangeLoading from "components/RouteChangeLoading";
import { poppins, caveat } from "src/utils/fonts";

/**
 * Componente principal da aplicação
 * Envolve todo o app com o provedor de autenticação e layout comum
 */
function MyApp({ Component, pageProps }) {
  return (
    // Aplica as variáveis das fontes na div principal
    <div className={`${poppins.variable} ${caveat.variable} font-sans`}>
      <AuthProvider>
        <ViewProvider>
          <Layout>
            <Component {...pageProps} />
          </Layout>
          <RouteChangeLoading />
        </ViewProvider>
      </AuthProvider>
    </div>
  );
}

export default MyApp;
