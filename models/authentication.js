/**
 * This model handles user authentication, including password hashing,
 * password comparison, and session management.
 */

import authorization from "models/authorization.js";
import password from "models/password";
import session from "models/session.js";
import user from "models/user.js";
import validator from "models/validator.js";
import {
  UnauthorizedError,
  ForbiddenError,
  ValidationSessionError,
  PasswordExpiredError,
} from "errors/index.js";
import ERROR_MESSAGES from "models/error-messages.js";

/**
 * Generates a hash for a password.
 * @param {string} unhashedPassword - The password to be hashed.
 * @returns {Promise<string>} - Returns the hashed password.
 */
async function hashPassword(unhashedPassword) {
  return await password.hashPassword(unhashedPassword);
}

/**
 * Compares a provided password with a hash.
 * @param {string} providedPassword - The provided password.
 * @param {string} hash - The stored hash.
 * @throws {UnauthorizedError} - Throws an error if the password does not match the hash.
 */
async function comparePassword(providedPassword, hash) {
  const passwordMatches = await password.comparePassword(
    providedPassword,
    hash,
  );

  if (!passwordMatches) {
    throw new UnauthorizedError(ERROR_MESSAGES.PASSWORD_MISMATCH);
  }
}

/**
 * Middleware that injects an authenticated or anonymous user into the request context.
 * @param {Object} request - HTTP request object.
 * @param {Object} response - HTTP response object.
 * @param {Function} next - Next middleware function.
 */
async function injectAnonymousOrUser(request, response, next) {
  if (request.cookies?.session_id) {
    const cleanCookies = validator(
      { token: request.cookies.session_id },
      {
        token: "required",
      },
    );
    request.cookies.session_id = cleanCookies.token;

    await injectAuthenticatedUser(request);
    return next();
  } else {
    injectAnonymousUser(request);
    return next();
  }
}

/**
 * Creates a new session for the user and sets the corresponding cookies.
 * @param {Object} userObject - User object.
 * @param {Object} response - HTTP response object.
 * @returns {Object} - Returns the created session.
 */
async function createSessionAndSetCookies(userObject, response) {
  const sessionObject = await session.create(userObject);
  session.setSessionTokenInCookieResponse(sessionObject, response);
  return sessionObject;
}

// Helper functions for inject authenticated user
async function injectAuthenticatedUser(request) {
  const sessionObject = await session.findOneValidFromRequest(request);
  const userObject = await user.findOneUser({ id: sessionObject.user_id });

  if (!userObject) {
    throw new ValidationSessionError(ERROR_MESSAGES.USER_NOT_FOUND);
  }

  if (!authorization.can(userObject, "read:session:self", sessionObject)) {
    throw new ForbiddenError(ERROR_MESSAGES.PERMISSION_DENIED);
  }

  request.context = {
    ...request.context,
    user: userObject,
    session: sessionObject,
  };
}

function checkIfUserPasswordExpired(request, response, next) {
  const userObject = request.context?.user;
  if (userObject && Date.parse(userObject.password_expires_at) < Date.now()) {
    throw new PasswordExpiredError();
  }

  return next();
}

// Helper functions for inject anonymous user
function injectAnonymousUser(request) {
  const anonymousUser = user.createAnonymous();
  request.context = {
    ...request.context,
    user: anonymousUser,
  };
}

const authentication = {
  hashPassword,
  comparePassword,
  injectAnonymousOrUser,
  createSessionAndSetCookies,
  checkIfUserPasswordExpired,
};

export default authentication;
