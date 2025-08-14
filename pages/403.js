import ErrorPage from "components/ui/ErrorPage";
import { texts } from "src/utils/texts.js";
import { useRouter } from "next/navigation";
export default function ForbiddenError() {
  const router = useRouter();

  return (
    <ErrorPage
      title={texts.errorPages.forbidden.title}
      message={texts.errorPages.forbidden.message}
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
