import ErrorPage from "components/ui/ErrorPage";
import { texts } from "src/utils/texts.js";
import { useRouter } from "next/navigation";
import { NoSymbolIcon } from "@heroicons/react/24/outline";

export default function ForbiddenLoginError() {
  const router = useRouter();

  return (
    <ErrorPage
      title={texts.errorPages.forbiddenLogin.title}
      message={texts.errorPages.forbiddenLogin.message}
      icon={NoSymbolIcon}
      buttons={[
        {
          text: texts.errorPages.forbiddenLogin.button,
          variant: "primary",
          onClick: () => router.push("/"),
        },
      ]}
    />
  );
}
