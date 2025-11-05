import { ServiceError } from "errors/index.js";
import { Client } from "pg";

/**
 * Mapeia códigos de erro do PostgreSQL para mensagens mais amigáveis
 * e (idealmente) status codes HTTP.
 */
function handleDatabaseError(err) {
  // Se não for um erro do PG com código, tratamos como genérico.
  if (!err.code) {
    return new ServiceError({
      cause: err,
      message: "Erro na conexão com o Banco ou na Query",
      // statusCode: 503 // Idealmente, sua ServiceError teria um statusCode
    });
  }

  // Agora, tratamos os códigos específicos
  switch (err.code) {
    case "23503": // foreign_key_violation
      return new ServiceError({
        cause: err,
        message: `A operação falhou pois referencia um registro que não existe. (Violação de Chave Estrangeira)`,
        // constraint: err.constraint, // Vc pode querer adicionar isso
        statusCode: 409, // Conflito ou 400 Bad Request
      });

    case "23505": // unique_violation
      return new ServiceError({
        cause: err,
        message: `Já existe um registro com esse valor. O campo deve ser único. (Violação de Unicidade)`,
        // constraint: err.constraint,
        statusCode: 409, // Conflito
      });

    case "23502": // not_null_violation
      return new ServiceError({
        cause: err,
        message: `A operação falhou porque um campo obrigatório está nulo. (Violação de Not Null)`,
        // column: err.column,
        statusCode: 400, // Bad Request
      });

    case "22P02": // invalid_text_representation
      return new ServiceError({
        cause: err,
        message: `O formato de um dos dados enviados é inválido. (Ex: UUID ou data mal formatada)`,
        statusCode: 400, // Bad Request
      });

    default:
      // Para outros erros de DB que não mapeamos (ex: syntax error)
      return new ServiceError({
        cause: err,
        message: "Erro na conexão com o Banco ou na Query",
      });
  }
}

async function query(queryObject) {
  let client = await getNewClient();
  try {
    const res = await client.query(queryObject);
    return res;
  } catch (err) {
    const specificError = handleDatabaseError(err);
    throw specificError;
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

  return process.env.POSTGRES_SSL === "true";
}
