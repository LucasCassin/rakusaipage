import ErrorPage from "components/ui/ErrorPage";
import { texts } from "src/utils/texts.js";
import { useRouter } from "next/navigation";
import { ClockIcon } from "@heroicons/react/24/outline";

export default function GatewayTimeoutError() {
  const router = useRouter();
  const handleReload = () => window.location.reload();

  return (
    <ErrorPage
      errorCode="504"
      title={texts.errorPages.gatewayTimeout.title}
      message={texts.errorPages.gatewayTimeout.message}
      icon={ClockIcon}
      buttons={[
        {
          text: texts.errorPages.gatewayTimeout.button,
          variant: "primary",
          onClick: () => router.push("/"),
        },
        {
          text: texts.errorPages.gatewayTimeout.reloadButton,
          variant: "secondary",
          onClick: handleReload,
        },
      ]}
    />
  );
}
