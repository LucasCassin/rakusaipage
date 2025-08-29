import ErrorPage from "components/ui/ErrorPage";
import { texts } from "src/utils/texts.js";
import { useRouter } from "next/navigation";
import { ServerStackIcon } from "@heroicons/react/24/outline";

export default function ServerError() {
  const router = useRouter();
  const handleReload = () => window.location.reload();

  return (
    <ErrorPage
      errorCode="500"
      title={texts.errorPages.serverError.title}
      message={texts.errorPages.serverError.message}
      icon={ServerStackIcon}
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
