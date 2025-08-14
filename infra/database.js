import { ServiceError } from "errors/index.js";
import { Client } from "pg";

async function query(queryObject) {
  let client = await getNewClient();
  try {
    const res = await client.query(queryObject);
    return res;
  } catch (err) {
    const ServiceErrorObject = new ServiceError({
      cause: err,
      message: "Erro na conexão com o Banco ou na Query",
    });
    console.error(ServiceErrorObject);
    throw ServiceErrorObject;
  } finally {
    await client?.end();
  }
}

async function getNewClient() {
  const client = new Client({
    host: process.env.POSTGRES_HOST,
    port: process.env.POSTGRES_PORT,
    user: process.env.POSTGRES_USER,
    database: process.env.POSTGRES_DB,
    password: process.env.POSTGRES_PASSWORD,
    ssl: getSSLValues(),
  });

  await client.connect();
  return client;
}

const database = {
  query,
  getNewClient,
};

export default database;

function getSSLValues() {
  if (process.env.POSTGRES_CA) {
    return {
      ca: process.env.POSTGRES_CA,
    };
  }

  return process.env.NODE_ENV === "production" ? true : false;
}
