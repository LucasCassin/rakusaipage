import { getVideoAulaCatalogProps } from "src/utils/videoAulaUtils.js";
import { settings } from "config/settings.js";
import VideoAulaCatalog from "components/student/VideoAulaCatalog";

export default function VideoAulasFuePage({ collections }) {
  // Configurações específicas para a página de Fue
  const fuePageConfig = {
    title: "Vídeoaulas Fue",
    type: "fue",
    defaultUrl: "videoaulas-fue",
    requiredFeatures: [
      settings.videoAulas.FEATURE_FUE_INICIANTE,
      settings.videoAulas.FEATURE_FUE_INTERMEDIARIO,
      settings.videoAulas.FEATURE_FUE_AVANCADO,
      settings.videoAulas.FEATURE_FUE_PROFESSOR,
    ],
  };

  return (
    <VideoAulaCatalog collections={collections} pageConfig={fuePageConfig} />
  );
}

export const getServerSideProps = getVideoAulaCatalogProps;
