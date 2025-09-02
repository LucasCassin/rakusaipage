import Head from "next/head";
import HomeContent from "components/HomeContent";
import { texts } from "src/utils/texts.js";
import {
  fetchLandingPageData,
  fetchUpcomingPresentations,
  fetchHorariosAula,
  fetchTiposEvento,
  fetchInstrumentos,
} from "services/contentfulService.js";

/**
 * Página inicial da aplicação
 */
// A página agora recebe 'pageData' e 'presentations' como props
export default function Home({
  pageData,
  presentations,
  horarios,
  tiposEvento,
  instrumentos,
}) {
  return (
    <>
      <Head>
        <title>{texts.home.title}</title>
        <meta name="description" content={texts.home.description} />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      </Head>

      {/* Passamos todos os dados para os componentes filhos */}
      <HomeContent
        pageData={pageData}
        presentations={presentations}
        horarios={horarios}
        tiposEvento={tiposEvento}
        instrumentos={instrumentos}
      />
    </>
  );
}

export async function getStaticProps() {
  // Chamamos todas as funções em paralelo para otimizar
  const [pageData, presentations, horarios, tiposEvento, instrumentos] =
    await Promise.all([
      fetchLandingPageData(),
      fetchUpcomingPresentations(),
      fetchHorariosAula(),
      fetchTiposEvento(),
      fetchInstrumentos(),
    ]);

  return {
    props: {
      pageData,
      presentations,
      horarios,
      tiposEvento,
      instrumentos,
    },
    revalidate: 60,
  };
}
