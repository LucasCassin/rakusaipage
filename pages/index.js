import Head from "next/head";
import HomeContent from "components/HomeContent";
import { texts } from "src/utils/texts.js";
import {
  fetchLandingPageData,
  fetchUpcomingPresentations,
} from "services/contentfulService.js";

/**
 * Página inicial da aplicação
 */
// A página agora recebe 'pageData' e 'presentations' como props
export default function Home({ pageData, presentations }) {
  return (
    <>
      <Head>
        <title>{texts.home.title}</title>
        <meta name="description" content={texts.home.description} />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      </Head>

      {/* Passamos todos os dados para os componentes filhos */}
      <HomeContent pageData={pageData} presentations={presentations} />
    </>
  );
}

// Função do Next.js para buscar dados estáticos na hora da build
export async function getStaticProps() {
  // Chamamos as duas funções para buscar todos os dados necessários
  const pageData = await fetchLandingPageData();
  const presentations = await fetchUpcomingPresentations();

  return {
    props: {
      pageData,
      presentations,
    },
    revalidate: 60, // Regenera a página a cada 60s para buscar novos dados
  };
}
