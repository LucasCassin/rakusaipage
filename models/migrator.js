/**
 * This model handles the execution and listing of pending database migrations.
 * It uses `node-pg-migrate` to manage migrations.
 */

import database from "infra/database.js";
import { ServiceError } from "errors/index.js";
import ERROR_MESSAGES from "models/error-messages.js";
import migrationRunner from "node-pg-migrate";
import { resolve } from "node:path";

// Configuration for migration execution
const migrationsConfig = {
  dir: resolve("infra", "migrations"),
  direction: "up",
  log: () => {},
  migrationsTable: "pgmigrations",
};

/**
 * Executes or lists pending migrations.
 * @param {Object} options - Options for migration execution.
 * @param {boolean} options.dryRun - Defines if migrations will only be listed (true) or executed (false).
 * @returns {Array} - Returns a list of executed or pending migrations.
 * @throws {ServiceError} - Throws an error if an issue occurs during execution.
 */
async function runMigrations({ dryRun }) {
  let dbClient;
  try {
    dbClient = await database.getNewClient();

    const migrations = await migrationRunner({
      ...migrationsConfig,
      dbClient,
      dryRun,
    });
    return migrations;
  } catch (error) {
    throw new ServiceError({
      ...ERROR_MESSAGES.MIGRATION_ERROR,
      cause: error,
    });
  } finally {
    await dbClient?.end();
  }
}

const migrator = {
  /**
   * Executes all pending migrations.
   * @returns {Array} - Returns a list of executed migrations.
   */
  runPendingMigrations: () => runMigrations({ dryRun: false }),

  /**
   * Lists all pending migrations without executing them.
   * @returns {Array} - Returns a list of pending migrations.
   */
  listPendingMigrations: () => runMigrations({ dryRun: true }),
};

export default migrator;
