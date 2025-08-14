import ErrorPage from "components/ui/ErrorPage";
import { texts } from "src/utils/texts.js";
import { useRouter } from "next/navigation";

export default function ServiceUnavailableError() {
  const router = useRouter();

  const handleReload = () => {
    if (typeof window !== "undefined") {
      window.location.reload();
    }
  };

  return (
    <ErrorPage
      title={texts.errorPages.serviceUnavailable.title}
      message={texts.errorPages.serviceUnavailable.message}
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
