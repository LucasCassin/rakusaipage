import database from "infra/database.js";

export const getStatus = async () => {
  const updatedAt = new Date().toISOString();

  const dbVersionResult = await database.query("SHOW server_version;");
  const versionValue = dbVersionResult.rows[0].server_version;

  const dbMaxConnectionResult = await database.query("SHOW max_connections;");
  const maxConnectionsValue = parseInt(
    dbMaxConnectionResult.rows[0].max_connections,
  );

  const databaseName = process.env.POSTGRES_DB;
  const dbOpenedConnectionsResult = await database.query({
    text: "SELECT count(*)::int FROM pg_stat_activity WHERE datname = $1;",
    values: [databaseName],
  });
  const openedConnectionsValue = dbOpenedConnectionsResult.rows[0].count;

  return {
    updated_at: updatedAt,
    dependencies: {
      database: {
        version: versionValue,
        max_connections: maxConnectionsValue,
        opened_connections: openedConnectionsValue,
      },
    },
  };
};
