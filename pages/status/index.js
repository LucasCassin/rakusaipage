import useSWR from "swr";
import { settings } from "config/settings";
import { texts } from "src/utils/texts.js";
import PageLayout from "components/layouts/PageLayout";
import { useMessage } from "src/hooks/useMessage.js";
import StatusContent from "components/status/StatusContent";

async function fetchAPI(key) {
  const res = await fetch(key);
  const resBody = await res.json();
  return resBody;
}

export default function StatusPage() {
  const { error, setError } = useMessage();
  const { isLoading, data } = useSWR(
    settings.global.API.ENDPOINTS.STATUS,
    fetchAPI,
    {
      refreshInterval: 2000,
      onError: (err) => {
        setError(texts.status.message.error.connection);
        console.error("Erro ao buscar status:", err);
      },
    },
  );

  return (
    <PageLayout title={texts.status.title} description="Status do sistema">
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="max-w-md w-full space-y-8">
            <StatusContent isLoading={isLoading} error={error} data={data} />
          </div>
        </div>
      </div>
    </PageLayout>
  );
}
