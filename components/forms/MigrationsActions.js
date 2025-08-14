import { texts } from "src/utils/texts.js";

export default function MigrationsActions({
  canRead,
  canCreate,
  isLoading,
  pendingMigrations,
  onCheck,
  onExecute,
}) {
  return (
    <div className="flex justify-between space-x-4">
      {canRead && (
        <button
          onClick={onCheck}
          disabled={isLoading}
          className={`flex-1 py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white ${
            isLoading
              ? "bg-blue-400 cursor-not-allowed"
              : "bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          }`}
        >
          {isLoading
            ? texts.migrations.button.loading
            : texts.migrations.button.check}
        </button>
      )}

      {canCreate && (
        <button
          onClick={onExecute}
          disabled={isLoading || pendingMigrations.length === 0}
          className={`flex-1 py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white ${
            isLoading || pendingMigrations.length === 0
              ? "bg-emerald-600 cursor-not-allowed"
              : "bg-emerald-700 hover:bg-emerald-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500"
          }`}
        >
          {isLoading
            ? texts.migrations.button.running
            : texts.migrations.button.run}
        </button>
      )}
    </div>
  );
}
