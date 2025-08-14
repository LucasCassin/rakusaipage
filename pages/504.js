import ErrorPage from "components/ui/ErrorPage";
import { texts } from "src/utils/texts.js";
import { useRouter } from "next/navigation";

export default function GatewayTimeoutError() {
  const router = useRouter();

  const handleReload = () => {
    if (typeof window !== "undefined") {
      window.location.reload();
    }
  };

  return (
    <ErrorPage
      title={texts.errorPages.gatewayTimeout.title}
      message={texts.errorPages.gatewayTimeout.message}
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
