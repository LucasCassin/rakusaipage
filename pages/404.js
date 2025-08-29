import ErrorPage from "components/ui/ErrorPage";
import { texts } from "src/utils/texts.js";
import { useRouter } from "next/navigation";
import { QuestionMarkCircleIcon } from "@heroicons/react/24/outline";

export default function NotFoundError() {
  const router = useRouter();

  return (
    <ErrorPage
      errorCode="404"
      title={texts.errorPages.notFound.title}
      message={texts.errorPages.notFound.message}
      icon={QuestionMarkCircleIcon}
      buttons={[
        {
          text: texts.errorPages.notFound.button,
          variant: "primary",
          onClick: () => router.push("/"),
        },
      ]}
    />
  );
}
