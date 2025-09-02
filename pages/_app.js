import "styles/globals.css";
import { AuthProvider } from "src/contexts/AuthContext.js";
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
        <Layout>
          <Component {...pageProps} />
        </Layout>
        <RouteChangeLoading />
      </AuthProvider>
    </div>
  );
}

export default MyApp;
