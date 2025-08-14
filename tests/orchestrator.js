import retry from "async-retry";
import database from "infra/database.js";
import migrator from "models/migrator.js";
import crypto from "crypto";
import setCookieParser from "set-cookie-parser";
import { v4 as uuidv4 } from "uuid";

const webserverUrl = "http://localhost:3000";

if (process.env.NODE_ENV !== "test") {
  throw new Error({
    message: "Orchestrator should only be used in tests",
  });
}

async function waitForAllServices() {
  await waitForWebService();

  async function waitForWebService() {
    return retry(fetchStatusPage, {
      retries: 100,
      maxTimeout: 1000,
    });

    async function fetchStatusPage() {
      const res = await fetch(`${webserverUrl}/api/v1/status`);
      if (res.status !== 200) {
        throw Error();
      }
    }
  }
}

async function clearDatabase() {
  await database.query("drop schema public cascade; create schema public;");
}

async function clearTable(tableName) {
  await database.query(`TRUNCATE TABLE ${tableName} RESTART IDENTITY CASCADE;`);
}

function generateRandomToken() {
  return crypto.randomBytes(48).toString("hex");
}

function generateRandomUUIDV4() {
  return uuidv4();
}

function parseSetCookies(response) {
  const setCookieHeaderValues = response.headers.get("set-cookie");
  const parsedCookies = setCookieParser.parse(setCookieHeaderValues, {
    map: true,
  });
  return parsedCookies;
}

const orchestrator = {
  waitForAllServices,
  clearDatabase,
  webserverUrl,
  runPendingMigrations: migrator.runPendingMigrations,
  clearTable,
  generateRandomToken,
  generateRandomUUIDV4,
  parseSetCookies,
};

export default orchestrator;
