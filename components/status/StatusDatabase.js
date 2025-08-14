import { texts } from "src/utils/texts.js";

export default function StatusDatabase({ data }) {
  const connectionPercentage =
    (data.opened_connections / data.max_connections) * 100;

  const getStatusColor = (percentage) => {
    if (percentage <= 60) return "bg-green-100 text-green-800";
    if (percentage <= 80) return "bg-yellow-100 text-yellow-800";
    return "bg-red-100 text-red-800";
  };

  const statusColor = getStatusColor(connectionPercentage);

  return (
    <div className="bg-gray-50 rounded-lg p-4">
      <h4 className="text-base font-medium text-gray-900 mb-4">
        {texts.status.services.database}
      </h4>
      <ul className="space-y-3">
        <li className="text-sm text-gray-600">
          <div className="flex items-center justify-between">
            <span className="font-medium">{texts.status.connections}</span>
            <span
              className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColor}`}
            >
              {data.opened_connections} / {data.max_connections} (
              {connectionPercentage.toFixed(1)}%)
            </span>
          </div>
          <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
            <div
              className={`h-2 rounded-full ${
                connectionPercentage <= 60
                  ? "bg-green-500"
                  : connectionPercentage <= 80
                    ? "bg-yellow-500"
                    : "bg-red-500"
              }`}
              style={{ width: `${connectionPercentage}%` }}
            ></div>
          </div>
        </li>
        <li className="text-sm text-gray-600">
          <span className="font-medium">{texts.status.postgresVersion}</span>{" "}
          {data.version}
        </li>
      </ul>
    </div>
  );
}
