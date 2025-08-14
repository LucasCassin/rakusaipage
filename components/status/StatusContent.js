import { texts } from "src/utils/texts.js";
import LoadingSpinner from "components/ui/LoadingSpinner";
import Alert from "components/ui/Alert";
import StatusUpdatedAt from "./StatusUpdatedAt";
import StatusDependencies from "./StatusDependencies";

export default function StatusContent({ isLoading, error, data }) {
  return (
    <div className="space-y-8">
      <div>
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          {texts.status.title}
        </h2>
      </div>

      <div className="mt-8 bg-white py-8 px-4 shadow rounded-lg sm:px-10">
        {isLoading ? (
          <LoadingSpinner message={texts.status.message.loading} />
        ) : error ? (
          <Alert type="error">{error}</Alert>
        ) : (
          <>
            <StatusUpdatedAt data={data} />
            <StatusDependencies data={data} />
          </>
        )}
      </div>
    </div>
  );
}
