import ErrorPage from "components/ui/ErrorPage";
import { texts } from "src/utils/texts.js";
import { useRouter } from "next/navigation";
import { CloudExclamationIcon } from "@heroicons/react/24/outline";

export default function BadGatewayError() {
  const router = useRouter();
  const handleReload = () => window.location.reload();

  return (
    <ErrorPage
      errorCode="502"
      title={texts.errorPages.badGateway.title}
      message={texts.errorPages.badGateway.message}
      icon={CloudExclamationIcon}
      buttons={[
        {
          text: texts.errorPages.badGateway.button,
          variant: "primary",
          onClick: () => router.push("/"),
        },
        {
          text: texts.errorPages.badGateway.reloadButton,
          variant: "secondary",
          onClick: handleReload,
        },
      ]}
    />
  );
}
