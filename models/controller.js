/**
 * This model handles error handlers and responses for HTTP requests.
 */

import session from "models/session.js";
import { InternalServerError, MethodNotAllowedError } from "errors/index.js";
import ERROR_MESSAGES from "models/error-messages.js";

/**
 * Handler for requests that do not match any route.
 * @param {Object} req - HTTP request object.
 * @param {Object} res - HTTP response object.
 */
function onNoMatchHandler(req, res) {
  const publicErrorObject = new MethodNotAllowedError();
  res.status(publicErrorObject.statusCode).json(publicErrorObject);
}

/**
 * Handler for errors occurring during application execution.
 * @param {Error} err - The error that occurred.
 * @param {Object} req - HTTP request object.
 * @param {Object} res - HTTP response object.
 */
function onErrorHandler(err, req, res) {
  const errorMap = [
    "ServiceError",
    "ValidationError",
    "UnprocessableEntityError",
    "NotFoundError",
    "ForbiddenError",
    "PasswordExpiredError",
    "NonEditableUserError",
  ];

  if (errorMap.includes(err.name)) {
    return res.status(err.statusCode).json(err);
  }

  if (
    err.name === "UnauthorizedError" ||
    err.name === "ValidationSessionError"
  ) {
    session.clearSessionIdCookie(res);
    return res.status(err.statusCode).json(err);
  }

  const publicErrorObject = new InternalServerError({
    ...ERROR_MESSAGES.INTERNAL_SERVER_ERROR,
    cause: err,
    statusCode: err.statusCode,
  });
  res.status(publicErrorObject.statusCode).json(publicErrorObject);
}

const controller = {
  errorsHandlers: {
    onNoMatch: onNoMatchHandler,
    onError: onErrorHandler,
  },
};

export default controller;
