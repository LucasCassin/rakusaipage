import { getVideoAulaDetailPageProps } from "src/utils/videoAulaUtils.js";
import CollectionDetailPage from "components/student/CollectionDetailPage";

export default function FueCollectionPage(props) {
  // Configurações específicas para a página de Taiko
  const fuePageConfig = {
    backLink: "/videoaulas-fue",
    backText: "Voltar para todas as coleções de Fue",
  };

  return <CollectionDetailPage {...props} pageConfig={fuePageConfig} />;
}

// A função getServerSideProps agora é uma única linha reutilizável
export const getServerSideProps = getVideoAulaDetailPageProps;
