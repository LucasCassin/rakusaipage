/**
 * This model handles the creation, renewal, and expiration of user sessions.
 * It also manages cookies related to sessions.
 */

import database from "infra/database.js";
import user from "models/user.js";
import validator from "models/validator.js";
import { NotFoundError, ValidationSessionError } from "errors/index.js";
import ERROR_MESSAGES from "models/error-messages.js";
import crypto from "node:crypto";
var cookie = require("cookie");

const SESSION_EXPIRATION_IN_SECONDS = 60 * 60 * 24 * 1; // 1 day

/**
 * Creates a new session for a user.
 * @param {Object} userData - User data.
 * @returns {Object} - Returns the created session.
 */
async function create(userData) {
  const sessionToken = crypto.randomBytes(48).toString("hex");
  const expirationDate = new Date(
    Date.now() + 1000 * SESSION_EXPIRATION_IN_SECONDS,
  );

  const validatedUserData = validator(userData, {
    id: "required",
  });

  const query = {
    text: `INSERT INTO 
            sessions 
            (token, user_id, expires_at)
          VALUES 
            ($1, $2, $3) 
          RETURNING 
            *;`,
    values: [sessionToken, validatedUserData.id, expirationDate],
  };

  const results = await database.query(query);
  return results.rows[0];
}

/**
 * Renews an existing session and updates the cookie.
 * @param {Object} sessionObject - Session object.
 * @param {Object} response - HTTP response object.
 * @returns {Object} - Returns the renewed session.
 */
async function renew(sessionObject, response) {
  validator(
    { session_id: sessionObject.session_id },
    { session_id: "required" },
  );
  const sessionObjectRenewed = await renewObjectInDatabase(
    sessionObject.session_id,
  );
  setSessionTokenInCookieResponse(sessionObjectRenewed, response);
  return sessionObjectRenewed;

  async function renewObjectInDatabase(sessionId) {
    const expiresAt = new Date(
      Date.now() + 1000 * SESSION_EXPIRATION_IN_SECONDS,
    );

    const query = {
      text: `UPDATE 
              sessions 
            SET
              expires_at = $2,
              updated_at = timezone('utc', now())
            WHERE 
              session_id = $1
            RETURNING 
              *;`,
      values: [sessionId, expiresAt],
    };

    const results = await database.query(query);
    return results.rows[0];
  }
}

/**
 * Finds a session based on the provided parameters.
 * @param {Object} sessionParams - Session parameters.
 * @param {boolean} [isValidSession=true] - Defines if the session must be valid.
 * @returns {Object} - Returns the session found.
 */
async function findOneSession(sessionParams, isValidSession = true) {
  const { conditions, values } = buildSqlConditions(sessionParams, [
    "session_id",
    "token",
  ]);

  let whereClause = conditions.length > 0 ? `(${conditions.join(" OR ")})` : "";

  if (isValidSession) {
    whereClause += `${whereClause ? " AND " : ""}expires_at > timezone('utc', now())`;
  }

  const query = {
    text: `
      SELECT
        *
      FROM
        sessions
      WHERE
        ${whereClause}
      LIMIT 1
    ;`,
    values,
  };

  const results = await database.query(query);
  return results.rows[0];
}

/**
 * Finds a valid session based on the request.
 * @param {Object} request - HTTP request object.
 * @returns {Object} - Returns the valid session found.
 * @throws {ValidationSessionError} - Throws an error if the session is not valid.
 */
async function findOneValidFromRequest(request) {
  const sessionToken = request.cookies?.session_id;

  if (!sessionToken) {
    throw new ValidationSessionError(ERROR_MESSAGES.NO_ACTIVE_SESSION);
  }

  try {
    validator({ token: sessionToken }, { token: "required" });
  } catch (error) {
    throw new ValidationSessionError({
      ...ERROR_MESSAGES.INVALID_TOKEN,
      cause: error,
    });
  }

  const validSessionObject = await findOneSession(
    { token: sessionToken },
    true,
  );

  if (!validSessionObject) {
    throw new ValidationSessionError(ERROR_MESSAGES.NO_ACTIVE_SESSION);
  }

  return validSessionObject;
}

/**
 * Expires a specific session.
 * @param {Object} sessionObject - Session object.
 * @returns {Object} - Returns the expired session.
 */
async function expire(sessionObject) {
  // Validates the provided parameters
  const validParams = validator(sessionObject, {
    session_id: "optional",
    token: "optional",
  });

  // Dynamically builds the query conditions
  const conditions = [];
  const values = [];
  let index = 1;

  if (validParams.session_id) {
    conditions.push(`session_id = $${index}`);
    values.push(validParams.session_id);
    index++;
  }

  if (validParams.token) {
    conditions.push(`token = $${index}`);
    values.push(validParams.token);
    index++;
  }

  const query = {
    text: `
      UPDATE
        sessions
      SET
        expires_at = created_at - interval '1 day',
        updated_at = timezone('utc', now())
      WHERE
        ${conditions.join(" OR ")}
      RETURNING
        *
      ;`,
    values,
  };

  const results = await database.query(query);
  return results.rows[0];
}

/**
 * Expires all sessions of a user.
 * @param {Object} userObject - User object.
 * @returns {Array} - Returns the expired sessions.
 */
async function expireAllFromUser(userObject) {
  // Validates the provided parameters
  const validParams = validator(userObject, {
    id: "optional",
    email: "optional",
    username: "optional",
  });

  const newUser = await user.findOneUser(validParams);
  if (!newUser) {
    throw new NotFoundError(ERROR_MESSAGES.USER_NOT_FOUND);
  }

  // Dynamically builds the query conditions

  const query = {
    text: `
      UPDATE
        sessions
      SET
        expires_at = created_at - interval '1 day',
        updated_at = timezone('utc', now())
      WHERE
        user_id = $1
        AND expires_at >= timezone('utc', now())
      RETURNING
        *
      ;`,
    values: [newUser.id],
  };

  const results = await database.query(query);
  return results.rows;
}

/**
 * Sets the session token in the response cookie.
 * @param {Object} sessionObject - Session object.
 * @param {Object} response - HTTP response object.
 */
function setSessionTokenInCookieResponse(sessionObject, response) {
  validator({ token: sessionObject.token }, { token: "required" });
  response.setHeader("Set-Cookie", [
    cookie.serialize("session_id", sessionObject.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: SESSION_EXPIRATION_IN_SECONDS,
    }),
  ]);
}

/**
 * Removes the session cookie from the response.
 * @param {Object} response - HTTP response object.
 */
function clearSessionIdCookie(response) {
  response.setHeader("Set-Cookie", [
    cookie.serialize("session_id", "invalid", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: -1,
    }),
  ]);
}

// Helper function to build SQL conditions dynamically
function buildSqlConditions(params, fields) {
  const conditions = [];
  const values = [];
  let index = 1;

  for (const field of fields) {
    if (params[field]) {
      conditions.push(`${field} = $${index}`);
      values.push(params[field]);
      index++;
    }
  }

  return { conditions, values };
}

const session = {
  create,
  renew,
  findOneSession,
  findOneValidFromRequest,
  expire,
  expireAllFromUser,
  setSessionTokenInCookieResponse,
  clearSessionIdCookie,
};

export default session;
