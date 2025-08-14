import ErrorPage from "components/ui/ErrorPage";
import { texts } from "src/utils/texts.js";
import { useRouter } from "next/navigation";

export default function BadGatewayError() {
  const router = useRouter();

  const handleReload = () => {
    if (typeof window !== "undefined") {
      window.location.reload();
    }
  };

  return (
    <ErrorPage
      title={texts.errorPages.badGateway.title}
      message={texts.errorPages.badGateway.message}
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
