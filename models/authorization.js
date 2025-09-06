/**
 * This model handles user authorization for performing specific actions.
 * It checks if the user has the necessary permissions (features) and filters
 * inputs and outputs based on those permissions.
 */

import availableFeatures from "models/user-features";
import { ForbiddenError, ValidationError } from "errors";
import ERROR_MESSAGES from "models/error-messages.js";

/**
 * Checks if the user has permission to perform an action on a resource.
 * @param {Object} user - The user attempting to perform the action.
 * @param {string} feature - The feature the user needs to have.
 * @param {Object} [resource] - The resource on which the action will be performed.
 * @returns {boolean} - Returns `true` if the user has permission, otherwise `false`.
 */
function can(user, feature, resource) {
  validateUser(user);
  validateFeature(feature);

  if (!user.features.includes(feature)) return false;

  switch (feature) {
    case "update:user:self":
      return resource?.id && user.id === resource.id;

    case "update:user:password:self":
      return resource?.id && user.id === resource.id;

    case "read:user:self":
      return resource?.id && user.id === resource.id;

    case "update:user:features:self":
      return resource?.id && user.id === resource.id;

    case "read:session:self":
      return resource?.user_id && user.id === resource.user_id;
  }

  if (!resource) return true;

  return false;
}

/**
 * Middleware that checks if the user can make a request based on the feature.
 * @param {string} feature - The feature required to make the request.
 * @returns {Function} - Middleware that throws an error or calls `next`.
 */
function canRequest(feature) {
  return function (request, response, next) {
    const userTryingToRequest = request.context.user;

    if (!userTryingToRequest.features.includes(feature)) {
      throw new ForbiddenError(ERROR_MESSAGES.CAN_REQUEST_FORBIDDEN(feature));
    }

    return next();
  };
}

/**
 * Filters input fields based on the feature and user permissions.
 * @param {Object} user - The user attempting to perform the action.
 * @param {string} feature - The feature the user needs to have.
 * @param {Object} input - The input data to be filtered.
 * @param {Object} [target] - The resource on which the action will be performed.
 * @returns {Object} - Returns the filtered fields.
 */
function filterInput(user, feature, input, target) {
  validateUser(user);
  validateFeature(feature);
  validateInput(input);

  let filteredInputValues = {};

  if (feature === "create:user" && can(user, feature)) {
    filteredInputValues = {
      username: input.username,
      email: input.email,
      password: input.password,
    };
  }

  if (feature === "read:user:self" && can(user, feature, target)) {
    filteredInputValues = {
      username: input.username,
    };
  }

  if (feature === "read:user:other" && can(user, feature)) {
    filteredInputValues = {
      username: input.username,
    };
  }

  if (feature === "update:user:self" && can(user, feature, target)) {
    filteredInputValues = {
      email: input.email,
      username: input.username,
    };
  }

  if (feature === "update:user:password:self" && can(user, feature, target)) {
    filteredInputValues = {
      password: input.password,
    };
  }

  if (feature === "update:user:other" && can(user, feature)) {
    filteredInputValues = {
      password: input.password,
    };
  }

  if (feature === "update:user:features:self" && can(user, feature, target)) {
    filteredInputValues = {
      id: input.id,
      features: input.features,
    };
  }

  if (feature === "update:user:features:other" && can(user, feature)) {
    filteredInputValues = {
      id: input.id,
      features: input.features,
    };
  }

  if (feature === "create:session" && can(user, feature)) {
    filteredInputValues = {
      email: input.email,
      password: input.password,
    };
  }

  if (feature === "read:session:self" && can(user, feature, target)) {
    filteredInputValues = {
      session_id: input.session_id,
    };
  }

  if (feature === "read:session:other" && can(user, feature)) {
    filteredInputValues = {
      session_id: input.session_id,
    };
  }
  // Force the clean up of "undefined" values
  return cleanObject(filteredInputValues);
}

/**
 * Filters output fields based on the feature and user permissions.
 * @param {Object} user - The user attempting to perform the action.
 * @param {string} feature - The feature the user needs to have.
 * @param {Object} output - The output data to be filtered.
 * @returns {Object} - Returns the filtered fields.
 */
function filterOutput(user, feature, output) {
  validateUser(user);
  validateFeature(feature);
  validateOutput(output);

  let filteredOutputValues = {};

  if (feature === "create:user" && can(user, feature)) {
    if (user.id && output.id && user.id === output.id) {
      filteredOutputValues = {
        id: output.id,
        username: output.username,
        email: maskEmail(output.email),
        features: output.features,
        password_expires_at: output.password_expires_at,
        created_at: output.created_at,
        updated_at: output.updated_at,
      };
    }
  }

  if (feature === "read:user:self") {
    if (user.id && output.id && user.id === output.id) {
      filteredOutputValues = {
        id: output.id,
        username: output.username,
        email: maskEmail(output.email),
        features: output.features,
        password_expires_at: output.password_expires_at,
        created_at: output.created_at,
        updated_at: output.updated_at,
      };
    }
  }

  if (feature === "read:user:other") {
    filteredOutputValues = {
      id: output.id,
      username: output.username,
      features: output.features,
      password_expires_at: output.password_expires_at,
      created_at: output.created_at,
      updated_at: output.updated_at,
    };
  }

  if (
    feature === "update:user:self" ||
    feature === "update:user:password:self"
  ) {
    if (user.id && output.id && user.id === output.id) {
      filteredOutputValues = {
        id: output.id,
        username: output.username,
        email: maskEmail(output.email),
        features: output.features,
        password_expires_at: output.password_expires_at,
        created_at: output.created_at,
        updated_at: output.updated_at,
      };
    }
  }

  if (feature === "update:user:other") {
    filteredOutputValues = {
      id: output.id,
      username: output.username,
      features: output.features,
      password_expires_at: output.password_expires_at,
      created_at: output.created_at,
      updated_at: output.updated_at,
    };
  }

  if (feature === "update:user:features:self") {
    if (user.id && output.id && user.id === output.id) {
      filteredOutputValues = {
        features: output.features,
      };
    }
  }

  if (feature === "update:user:features:other") {
    filteredOutputValues = {
      features: output.features,
    };
  }

  if (feature === "read:migration" && can(user, feature)) {
    filteredOutputValues = output;
  }

  if (feature === "create:migration" && can(user, feature)) {
    filteredOutputValues = output;
  }
  if (feature === "create:session" && can(user, feature)) {
    if (user.id && output.user_id && user.id === output.user_id) {
      filteredOutputValues = {
        session_id: output.session_id,
        token: output.token,
        expires_at: output.expires_at,
        created_at: output.created_at,
        updated_at: output.updated_at,
      };
    }
  }

  if (feature === "read:session:self") {
    if (user.id && output.user_id && user.id === output.user_id) {
      filteredOutputValues = {
        session_id: output.session_id,
        token: output.token,
        expires_at: output.expires_at,
        created_at: output.created_at,
        updated_at: output.updated_at,
      };
    }
  }

  if (feature === "read:session:other" && can(user, feature)) {
    filteredOutputValues = {
      session_id: output.session_id,
      expires_at: output.expires_at,
      created_at: output.created_at,
      updated_at: output.updated_at,
    };
  }

  // Force the clean up of "undefined" values
  return cleanObject(filteredOutputValues);
}

// Helper function to validate user input
function validateUser(user) {
  if (!user) {
    throw new ValidationError(ERROR_MESSAGES.INVALID_USER);
  }

  if (!user.features || !Array.isArray(user.features)) {
    throw new ValidationError(ERROR_MESSAGES.INVALID_FEATURE_FROM_USER);
  }
}

// Helper function to validate feature input
function validateFeature(feature) {
  if (!feature) {
    throw new ValidationError(ERROR_MESSAGES.INVALID_FEATURE);
  }

  if (!availableFeatures.has(feature)) {
    throw new ValidationError(ERROR_MESSAGES.FEATURE_NOT_AVAILABLE);
  }
}

// Helper function to validate input data
function validateInput(input) {
  if (!input) {
    throw new ValidationError(ERROR_MESSAGES.INVALID_INPUT);
  }
}

// Helper function to validate output data
function validateOutput(output) {
  if (!output) {
    throw new ValidationError(ERROR_MESSAGES.INVALID_OUTPUT);
  }
}

// Helper function to mask email addresses
function maskEmail(email) {
  const [localPart, domain] = email.split("@");
  const maskedLocalPart =
    localPart.length > 2
      ? localPart[0] + "*".repeat(localPart.length - 2) + localPart.slice(-1)
      : localPart[0] + "*";
  return `${maskedLocalPart}@${domain}`;
}

// Helper funcction to clean up objects from undefined values
function cleanObject(obj) {
  return JSON.parse(JSON.stringify(obj));
}

const authorization = {
  can,
  canRequest,
  filterInput,
  filterOutput,
};

export default authorization;
