import Head from "next/head";
import HomeContent from "components/HomeContent";
import InitialLoading from "components/InitialLoading";
import { texts } from "src/utils/texts.js";

/**
 * Página inicial da aplicação
 */
export default function Home() {
  return (
    <>
      <Head>
        <title>{texts.home.title}</title>
        <meta name="description" content={texts.home.description} />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      </Head>

      <InitialLoading />
      <HomeContent />
    </>
  );
}
