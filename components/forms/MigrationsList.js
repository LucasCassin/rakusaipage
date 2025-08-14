import { texts } from "src/utils/texts.js";

export default function MigrationsList({ migrations }) {
  return (
    <div>
      <h3 className="text-lg font-medium text-gray-900 mb-4">
        {texts.migrations.pendingTitle} ({migrations.length})
      </h3>
      <div className="bg-gray-50 rounded-lg p-4">
        <div className="max-h-[300px] overflow-y-auto space-y-2">
          {migrations.map((migration) => (
            <div
              key={migration.name}
              className="p-3 bg-white rounded-md shadow-sm border border-gray-200"
            >
              <div className="space-y-1">
                <p className="text-sm font-medium text-gray-900">
                  {migration.name}
                </p>
                <p className="text-xs text-gray-500 font-mono break-all">
                  {migration.path}
                </p>
                <p className="text-xs text-gray-500">
                  {new Date(migration.timestamp).toLocaleString("pt-BR")}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
