import Head from "next/head";
import HomeContent from "components/HomeContent";
import { texts } from "src/utils/texts.js";
import { fetchHeroCarouselImages } from "services/contentfulService.js"; // <<< IMPORTAR

/**
 * Página inicial da aplicação
 */
export default function Home({ heroImages }) {
  // <<< RECEBE AS PROPS
  return (
    <>
      <Head>
        <title>{texts.home.title}</title>
        <meta name="description" content={texts.home.description} />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      </Head>

      {/* O HomeContent agora não precisa mais do InitialLoading, 
          pois a página só será exibida após os dados carregarem. 
          Você pode passar as imagens para ele se a lógica de login mudar, 
          ou diretamente para o PublicLandingPage dentro dele.
      */}
      <HomeContent heroImages={heroImages} />
    </>
  );
}

// Função do Next.js para buscar dados estáticos na hora da build
export async function getStaticProps() {
  const heroImages = await fetchHeroCarouselImages();

  return {
    props: {
      heroImages, // Passa as imagens como props para o componente da página
    },
    revalidate: 60, // Opcional: Regenera a página a cada 60s para buscar novas imagens
  };
}
