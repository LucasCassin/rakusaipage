import { Fragment } from "react";
import Head from "next/head";
import InitialLoading from "components/InitialLoading";

/**
 * Layout padrão para as páginas da aplicação
 * @param {Object} props
 * @param {string} props.title - Título da página
 * @param {string} props.description - Descrição da página
 * @param {React.ReactNode} props.children - Conteúdo da página
 * @param {string} props.maxWidth - Largura máxima do conteúdo (padrão: max-w-2/6)
 * @param {boolean} props.showInitialLoading - Se deve mostrar o InitialLoading (padrão: true)
 */
export default function PageLayout({
  title,
  description,
  children,
  className = "",
  showInitialLoading = true,
}) {
  return (
    <Fragment>
      <Head>
        <title>{title}</title>
        <meta name="description" content={description} />
      </Head>

      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        {showInitialLoading && <InitialLoading />}
        <div className={`max-w-2/6 w-full space-y-8 ${className}`}>
          {children}
        </div>
      </div>
    </Fragment>
  );
}
