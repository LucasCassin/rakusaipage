import "styles/globals.css";
import { AuthProvider } from "src/contexts/AuthContext.js";
import React from "react";
import Layout from "pages/layout.js";
import RouteChangeLoading from "components/RouteChangeLoading";

/**
 * Componente principal da aplicação
 * Envolve todo o app com o provedor de autenticação e layout comum
 */
function MyApp({ Component, pageProps }) {
  return (
    <AuthProvider>
      <Layout>
        <Component {...pageProps} />
      </Layout>
      <RouteChangeLoading />
    </AuthProvider>
  );
}

export default MyApp;
