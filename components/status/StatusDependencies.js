import { texts } from "src/utils/texts.js";
import StatusDatabase from "./StatusDatabase";

export default function StatusDependencies({ data }) {
  return (
    <div className="space-y-6">
      <h3 className="text-lg font-medium text-gray-900">
        {texts.status.services.title}
      </h3>
      <StatusDatabase data={data.dependencies.database} />
    </div>
  );
}
