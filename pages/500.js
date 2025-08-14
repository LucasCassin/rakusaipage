import ErrorPage from "components/ui/ErrorPage";
import { texts } from "src/utils/texts.js";
import { useRouter } from "next/navigation";

export default function ServerError() {
  const router = useRouter();

  const handleReload = () => {
    if (typeof window !== "undefined") {
      window.location.reload();
    }
  };

  return (
    <ErrorPage
      title={texts.errorPages.serverError.title}
      message={texts.errorPages.serverError.message}
      buttons={[
        {
          text: texts.errorPages.serverError.button,
          variant: "primary",
          onClick: () => router.push("/"),
        },
        {
          text: texts.errorPages.serverError.reloadButton,
          variant: "secondary",
          onClick: handleReload,
        },
      ]}
    />
  );
}
