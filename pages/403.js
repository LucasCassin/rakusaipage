import ErrorPage from "components/ui/ErrorPage";
import { texts } from "src/utils/texts.js";
import { useRouter } from "next/navigation";
import { ShieldExclamationIcon } from "@heroicons/react/24/outline";

export default function ForbiddenError() {
  const router = useRouter();

  return (
    <ErrorPage
      errorCode="403"
      title={texts.errorPages.forbidden.title}
      message={texts.errorPages.forbidden.message}
      icon={ShieldExclamationIcon}
      buttons={[
        {
          text: texts.errorPages.forbidden.button,
          variant: "primary",
          onClick: () => router.push("/"),
        },
      ]}
    />
  );
}
