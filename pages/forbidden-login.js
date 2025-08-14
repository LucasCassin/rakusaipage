import ErrorPage from "components/ui/ErrorPage";
import { texts } from "src/utils/texts.js";
import { useRouter } from "next/navigation";

export default function ForbiddenLoginError() {
  const router = useRouter();

  return (
    <ErrorPage
      title={texts.errorPages.forbiddenLogin.title}
      message={texts.errorPages.forbiddenLogin.message}
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
