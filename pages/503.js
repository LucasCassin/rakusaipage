import ErrorPage from "components/ui/ErrorPage";
import { texts } from "src/utils/texts.js";
import { useRouter } from "next/navigation";
import { PowerIcon } from "@heroicons/react/24/outline";

export default function ServiceUnavailableError() {
  const router = useRouter();
  const handleReload = () => window.location.reload();

  return (
    <ErrorPage
      errorCode="503"
      title={texts.errorPages.serviceUnavailable.title}
      message={texts.errorPages.serviceUnavailable.message}
      icon={PowerIcon}
      buttons={[
        {
          text: texts.errorPages.serviceUnavailable.button,
          variant: "primary",
          onClick: () => router.push("/"),
        },
        {
          text: texts.errorPages.serviceUnavailable.reloadButton,
          variant: "secondary",
          onClick: handleReload,
        },
      ]}
    />
  );
}
