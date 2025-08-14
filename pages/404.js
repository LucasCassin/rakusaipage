import ErrorPage from "components/ui/ErrorPage";
import { texts } from "src/utils/texts.js";
import { useRouter } from "next/navigation";
/**
 * Página de erro 404 - Not Found
 */
export default function NotFoundError() {
  const router = useRouter();

  return (
    <ErrorPage
      title={texts.errorPages.notFound.title}
      message={texts.errorPages.notFound.message}
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
