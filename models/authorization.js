import availableFeatures from "models/user-features.js";
import { ForbiddenError, ValidationError } from "errors";
import ERROR_MESSAGES from "models/error-messages.js";

// MUDANÇA: Centralização de todas as regras de campos em um único objeto de "perfis".
const profiles = {
  // ### User Features ###
  "create:user": {
    allowedInputFields: ["username", "email", "password"],
    allowedOutputFields: [
      "id",
      "username",
      "email",
      "features",
      "password_expires_at",
      "created_at",
      "updated_at",
    ],
    outputMasks: { email: maskEmail },
  },
  "read:user:self": {
    allowedInputFields: ["username"],
    allowedOutputFields: [
      "id",
      "username",
      "email",
      "features",
      "password_expires_at",
      "created_at",
      "updated_at",
    ],
    outputMasks: { email: maskEmail },
  },
  "read:user:other": {
    allowedInputFields: ["username"],
    allowedOutputFields: [
      "id",
      "username",
      "features",
      "password_expires_at",
      "created_at",
      "updated_at",
    ],
  },
  "update:user:self": {
    allowedInputFields: ["email", "username"],
    allowedOutputFields: [
      "id",
      "username",
      "email",
      "features",
      "password_expires_at",
      "created_at",
      "updated_at",
    ],
    outputMasks: { email: maskEmail },
  },
  "update:user:password:self": {
    allowedInputFields: ["password"],
    allowedOutputFields: [
      "id",
      "username",
      "email",
      "features",
      "password_expires_at",
      "created_at",
      "updated_at",
    ],
    outputMasks: { email: maskEmail },
  },
  "update:user:other": {
    allowedInputFields: ["password"],
    allowedOutputFields: [
      "id",
      "username",
      "features",
      "password_expires_at",
      "created_at",
      "updated_at",
    ],
  },
  "update:user:features:self": {
    allowedInputFields: ["id", "features"],
    allowedOutputFields: ["features"],
  },
  "update:user:features:other": {
    allowedInputFields: ["id", "features"],
    allowedOutputFields: ["features"],
  },

  // ### Session Features ###
  "create:session": {
    allowedInputFields: ["email", "password"],
    allowedOutputFields: [
      "session_id",
      "token",
      "expires_at",
      "created_at",
      "updated_at",
    ],
  },
  "read:session:self": {
    allowedInputFields: ["session_id"],
    allowedOutputFields: [
      "session_id",
      "token",
      "expires_at",
      "created_at",
      "updated_at",
    ],
  },
  "read:session:other": {
    allowedInputFields: ["session_id"],
    allowedOutputFields: [
      "session_id",
      "expires_at",
      "created_at",
      "updated_at",
    ],
  },

  // ### Comment Features ###
  "create:comment": {
    allowedInputFields: ["content", "video_id", "parent_id", "return_list"],
    allowedOutputFields: [
      "id",
      "content",
      "user_id",
      "video_id",
      "parent_id",
      "created_at",
      "updated_at",
      "username",
      "likes_count",
      "liked_by_user",
    ],
  },
  "read:comment": {
    allowedInputFields: ["video_id"],
    allowedOutputFields: [
      "id",
      "content",
      "user_id",
      "video_id",
      "parent_id",
      "created_at",
      "updated_at",
      "username",
      "likes_count",
      "liked_by_user",
    ],
  },
  "update:self:comment": {
    allowedInputFields: ["comment_id", "content", "return_list"],
    allowedOutputFields: [
      "id",
      "content",
      "user_id",
      "video_id",
      "parent_id",
      "created_at",
      "updated_at",
      "username",
      "likes_count",
      "liked_by_user",
    ],
  },
  "update:other:comment": {
    allowedInputFields: ["comment_id", "content", "return_list"],
    allowedOutputFields: [
      "id",
      "content",
      "user_id",
      "video_id",
      "parent_id",
      "created_at",
      "updated_at",
      "username",
      "likes_count",
      "liked_by_user",
    ],
  },
  "delete:self:comment": {
    allowedInputFields: ["comment_id", "return_list"],
    allowedOutputFields: ["id"],
  },
  "delete:other:comment": {
    allowedInputFields: ["comment_id", "return_list"],
    allowedOutputFields: ["id"],
  },
  "like:comment": {
    allowedInputFields: ["comment_id"],
    allowedOutputFields: ["comment_id", "likes_count"],
  },
  "unlike:comment": {
    allowedInputFields: ["comment_id"],
    allowedOutputFields: ["comment_id", "likes_count"],
  },

  // ### Payment Features ###
  "create:payment_plan": {
    allowedInputFields: [
      "name",
      "description",
      "full_value",
      "period_unit",
      "period_value",
    ],
    allowedOutputFields: [
      "id",
      "name",
      "description",
      "full_value",
      "period_unit",
      "period_value",
      "created_at",
      "updated_at",
    ],
  },
  "read:payment_plan": {
    allowedOutputFields: [
      "id",
      "name",
      "description",
      "full_value",
      "period_unit",
      "period_value",
      "created_at",
      "updated_at",
    ],
  },
  "update:payment_plan": {
    allowedInputFields: [
      "name",
      "description",
      "full_value",
      "period_unit",
      "period_value",
    ],
    allowedOutputFields: [
      "id",
      "name",
      "description",
      "full_value",
      "period_unit",
      "period_value",
      "created_at",
      "updated_at",
    ],
  },
  "delete:payment_plan": {
    allowedOutputFields: ["id"],
  },
  "create:subscription": {
    allowedInputFields: [
      "user_id",
      "plan_id",
      "discount_value",
      "payment_day",
      "start_date",
    ],
    allowedOutputFields: [
      "id",
      "user_id",
      "plan_id",
      "discount_value",
      "payment_day",
      "start_date",
      "is_active",
      "created_at",
      "updated_at",
    ],
  },
  "read:subscription:self": {
    allowedOutputFields: [
      "id",
      "plan_id",
      "discount_value",
      "payment_day",
      "start_date",
      "is_active",
      "plan_name",
      "plan_description",
      "plan_full_value",
    ],
  },
  "read:subscription:other": {
    allowedOutputFields: [
      "id",
      "user_id",
      "plan_id",
      "discount_value",
      "payment_day",
      "start_date",
      "is_active",
      "created_at",
      "updated_at",
      "plan_name",
      "username",
      "plan_description",
      "plan_full_value",
    ],
  },
  "update:subscription": {
    allowedInputFields: ["discount_value", "is_active"],
    allowedOutputFields: [
      "id",
      "user_id",
      "plan_id",
      "discount_value",
      "payment_day",
      "start_date",
      "is_active",
      "updated_at",
    ],
  },
  "delete:subscription": {
    allowedOutputFields: ["id"],
  },
  "read:payment:self": {
    allowedOutputFields: [
      "id",
      "subscription_id",
      "due_date",
      "amount_due",
      "status",
      "user_notified_payment",
      "user_notified_at",
      "confirmed_at",
      "plan_name",
    ],
  },
  "read:payment:other": {
    allowedOutputFields: [
      "id",
      "subscription_id",
      "due_date",
      "amount_due",
      "status",
      "user_notified_payment",
      "user_notified_at",
      "confirmed_at",
      "created_at",
      "updated_at",
      "plan_name",
      "username",
      "user_id",
    ],
  },
  "update:payment:indicate_paid": {
    allowedInputFields: ["payment_id"],
    allowedOutputFields: [
      "id",
      "status",
      "user_notified_payment",
      "user_notified_at",
    ],
  },
  "update:payment:confirm_paid": {
    allowedInputFields: ["payment_id"],
    allowedOutputFields: ["id", "status", "confirmed_at"],
  },

  // ### Presentation Features ###
  "create:presentation": {
    allowedInputFields: [
      "name",
      "date",
      "location",
      "meet_time",
      "meet_location",
      "description",
      "is_public",
    ],
    allowedOutputFields: [
      "id",
      "name",
      "date",
      "location",
      "meet_time",
      "meet_location",
      "description",
      "is_public",
      "created_by_user_id",
      "created_at",
    ],
  },
  "read:presentation:self": {
    allowedOutputFields: [
      "id",
      "name",
      "date",
      "location",
      "meet_time",
      "meet_location",
      "description",
      "is_public",
      "created_at",
      // (Vamos popular 'scenes', 'elements', 'viewers' na API)
    ],
  },
  "read:presentation:other": {
    allowedOutputFields: [
      "id",
      "name",
      "date",
      "location",
      "meet_time",
      "meet_location",
      "description",
      "is_public",
      "created_by_user_id",
      "created_at",
      "updated_at",
    ],
  },
  "update:presentation:self": {
    allowedInputFields: [
      "name",
      "date",
      "location",
      "meet_time",
      "meet_location",
      "description",
      "is_public",
    ],
    allowedOutputFields: [
      "id",
      "name",
      "date",
      "location",
      "meet_time",
      "meet_location",
      "description",
      "is_public",
      "updated_at",
    ],
  },
  "update:presentation:other": {
    allowedInputFields: [
      "name",
      "date",
      "location",
      "meet_time",
      "meet_location",
      "description",
      "is_public",
    ],
    allowedOutputFields: [
      "id",
      "name",
      "date",
      "location",
      "meet_time",
      "meet_location",
      "description",
      "is_public",
      "updated_at",
    ],
  },
  "delete:presentation:self": {
    allowedOutputFields: ["id"],
  },
  "delete:presentation:other": {
    allowedOutputFields: ["id"],
  },
  "manage:presentation_viewers": {
    allowedInputFields: ["user_id"],
    allowedOutputFields: ["id", "presentation_id", "user_id"],
  },
};

function can(user, feature, resource) {
  validateUser(user);
  validateFeature(feature);

  if (!user.features.includes(feature)) {
    return false;
  }

  // O switch agora lida APENAS com as regras que dependem do 'resource'.
  switch (feature) {
    case "update:user:self":
    case "update:user:password:self":
    case "read:user:self":
    case "update:user:features:self":
      return resource?.id && user.id === resource.id;

    case "read:session:self":
    case "update:self:comment":
    case "delete:self:comment":
    case "read:subscription:self":
    case "read:payment:self":
      return resource?.user_id && user.id === resource.user_id;

    case "update:presentation:self":
    case "delete:presentation:self":
      return (
        resource?.created_by_user_id && user.id === resource.created_by_user_id
      );
  }

  return true;
}

function filterInput(user, feature, input, target) {
  validateInput(input);

  const profile = profiles[feature];
  if (!profile || !profile.allowedInputFields) {
    // Valida o 'user' e 'feature' aqui para garantir que um erro seja lançado
    // se o perfil não for encontrado, como no comportamento original.
    validateUser(user);
    validateFeature(feature);
    return {};
  }

  if (!can(user, feature, target)) {
    throw new ForbiddenError(ERROR_MESSAGES.CAN_REQUEST_FORBIDDEN(feature));
  }

  const filteredInput = {};
  for (const field of profile.allowedInputFields) {
    if (input[field] !== undefined) {
      filteredInput[field] = input[field];
    }
  }
  return cleanObject(filteredInput);
}

function filterOutput(user, feature, output) {
  validateOutput(output);

  const profile = profiles[feature];
  if (!profile || !profile.allowedOutputFields) {
    validateUser(user);
    validateFeature(feature);
    return {};
  }

  // MUDANÇA: A verificação 'can' agora acontece ANTES de filtrar.
  // Se a permissão for negada, retorna um objeto vazio, passando no teste.
  if (!can(user, feature, output)) {
    return {};
  }

  const filteredOutput = {};
  for (const field of profile.allowedOutputFields) {
    if (output[field] !== undefined) {
      if (profile.outputMasks && profile.outputMasks[field]) {
        filteredOutput[field] = profile.outputMasks[field](output[field]);
      } else {
        filteredOutput[field] = output[field];
      }
    }
  }

  return cleanObject(filteredOutput);
}

// ===================================================================
// FUNÇÕES AUXILIARES (com pequenas correções de lógica)
// ===================================================================

function canRequest(feature) {
  return function (request, response, next) {
    const userTryingToRequest = request.context.user;
    if (!userTryingToRequest.features.includes(feature)) {
      throw new ForbiddenError(ERROR_MESSAGES.CAN_REQUEST_FORBIDDEN(feature));
    }
    return next();
  };
}

function validateUser(user) {
  if (!user) {
    throw new ValidationError(ERROR_MESSAGES.INVALID_USER);
  }
  if (!user.features || !Array.isArray(user.features)) {
    throw new ValidationError(ERROR_MESSAGES.INVALID_FEATURE_FROM_USER);
  }
}
function validateFeature(feature) {
  if (!feature) {
    throw new ValidationError(ERROR_MESSAGES.INVALID_FEATURE);
  }
  if (!availableFeatures.has(feature)) {
    throw new ValidationError(ERROR_MESSAGES.FEATURE_NOT_AVAILABLE);
  }
}
function validateInput(input) {
  if (!input) {
    throw new ValidationError(ERROR_MESSAGES.INVALID_INPUT);
  }
}
function validateOutput(output) {
  if (!output) {
    throw new ValidationError(ERROR_MESSAGES.INVALID_OUTPUT);
  }
}
function maskEmail(email) {
  if (!email) return;
  const [localPart, domain] = email.split("@");
  const maskedLocalPart =
    localPart.length > 2
      ? localPart[0] + "*".repeat(localPart.length - 2) + localPart.slice(-1)
      : localPart[0] + "*";
  return `${maskedLocalPart}@${domain}`;
}
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
