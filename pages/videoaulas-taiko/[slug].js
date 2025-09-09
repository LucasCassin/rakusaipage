import { getVideoAulaDetailPageProps } from "src/utils/videoAulaUtils.js";
import CollectionDetailPage from "components/student/CollectionDetailPage";

export default function TaikoCollectionPage(props) {
  // Configurações específicas para a página de Taiko
  const taikoPageConfig = {
    backLink: "/videoaulas-taiko",
    backText: "Voltar para todas as coleções de Taiko",
  };

  return <CollectionDetailPage {...props} pageConfig={taikoPageConfig} />;
}

// A função getServerSideProps agora é uma única linha reutilizável
export const getServerSideProps = getVideoAulaDetailPageProps;
