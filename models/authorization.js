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
      "active_count",
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

  // ### Presentation Features (Base) ###
  "create:presentation": {
    allowedInputFields: [
      "name",
      "date",
      "location",
      "meet_time",
      "meet_location",
      "description",
      "is_public",
      "is_active",
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
      "is_active",
      "created_by_user_id",
      "created_at",
    ],
  },
  // Perfil de Leitura Padrão (para "read:presentation")
  "read:presentation": {
    allowedOutputFields: [
      "id",
      "name",
      "date",
      "location",
      "meet_time",
      "meet_location",
      "description",
      "is_public",
      "is_active",
      "created_at",
      // 'scenes', 'elements', 'viewers' são populados na API
    ],
  },
  // Perfil de Leitura Admin (para "read:presentation:admin")
  "read:presentation:admin": {
    allowedOutputFields: [
      "id",
      "name",
      "date",
      "location",
      "meet_time",
      "meet_location",
      "description",
      "is_public",
      "is_active",
      "created_by_user_id",
      "created_at",
      "updated_at",
    ],
  },
  "update:presentation": {
    allowedInputFields: [
      "name",
      "date",
      "location",
      "meet_time",
      "meet_location",
      "description",
      "is_public",
      "is_active",
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
      "is_active",
      "updated_at",
    ],
  },
  "delete:presentation": {
    allowedOutputFields: ["id"],
  },

  // ### Presentation Features (Viewers / Elenco) ###
  "create:viewer": {
    allowedInputFields: ["user_id"],
    allowedOutputFields: ["id", "presentation_id", "user_id"],
  },
  "read:viewer": {
    allowedOutputFields: ["id", "username"], // Saída do findByPresentationId
  },
  "delete:viewer": {
    allowedOutputFields: ["id"],
  },

  // ### Presentation Features (Scenes) ###
  "create:scene": {
    allowedInputFields: [
      "presentation_id",
      "name",
      "scene_type",
      "order",
      "description",
    ],
    allowedOutputFields: [
      "id",
      "presentation_id",
      "name",
      "scene_type",
      "order",
      "description",
    ],
  },
  "update:scene": {
    allowedInputFields: ["name", "order", "description"],
    allowedOutputFields: ["id", "name", "scene_type", "order", "description"],
  },
  "delete:scene": {
    allowedOutputFields: ["id"],
  },

  // ### Presentation Features (Elements) ###
  "create:element": {
    allowedInputFields: [
      "scene_id",
      "element_type_id",
      "position_x",
      "position_y",
      "display_name",
      "assignees",
    ],
    allowedOutputFields: [
      "id",
      "scene_id",
      "element_type_id",
      "position_x",
      "position_y",
      "display_name",
      "assignees",
    ],
  },
  "update:element": {
    allowedInputFields: [
      "position_x",
      "position_y",
      "display_name",
      "assignees",
    ],
    allowedOutputFields: [
      "id",
      "position_x",
      "position_y",
      "display_name",
      "assignees",
    ],
  },
  "delete:element": {
    allowedOutputFields: ["id"],
  },

  // ### Presentation Features (Steps) ###
  "create:step": {
    allowedInputFields: ["scene_id", "order", "description", "assignees"],
    allowedOutputFields: [
      "id",
      "scene_id",
      "order",
      "description",
      "assignees",
    ],
  },
  "update:step": {
    allowedInputFields: ["order", "description", "assignees"],
    allowedOutputFields: ["id", "order", "description", "assignees"],
  },
  "delete:step": {
    allowedOutputFields: ["id"],
  },

  // --- LOJA: CONSUMIDOR ---
  // Feature: "shop:consumer:view"
  // Permite ver produtos (públicos) e criar pedidos.
  "shop:consumer:view": {
    allowedInputFields: [
      // Para criar pedido
      "items",
      "shipping_address",
      "coupon_code",
      "payment_method",
      // Para busca de produtos
      "search",
      "category",
      "tags",
    ],
    allowedOutputFields: [
      // Dados seguros do produto para exibir na vitrine
      "id",
      "slug",
      "name",
      "description",
      "category",
      "tags",
      "price_in_cents",
      "promotional_price_in_cents",
      "images",
      "available_at",
      "production_days", // Necessário para calcular prazo
      // Dados do próprio pedido
      "status",
      "total_in_cents",
      "tracking_code",
    ],
  },

  // --- LOJA: GERENCIAMENTO DE PRODUTOS ---
  // Feature: "shop:products:manage"
  // Usada tanto para CREATE quanto UPDATE de produtos.
  "shop:products:manage": {
    allowedInputFields: [
      "name",
      "slug",
      "description",
      "category",
      "tags",
      "price_in_cents",
      "promotional_price_in_cents",
      "minimum_price_in_cents",
      "stock_quantity",
      "purchase_limit_per_user",
      "allowed_features",
      "available_at",
      "unavailable_at",
      "is_active",
      "production_days",
      "weight_in_grams",
      "length_cm",
      "height_cm",
      "width_cm",
      "images",
    ],
    allowedOutputFields: [
      // Admin vê tudo
      "id",
      "slug",
      "name",
      "description",
      "category",
      "tags",
      "price_in_cents",
      "promotional_price_in_cents",
      "minimum_price_in_cents",
      "stock_quantity",
      "purchase_limit_per_user",
      "allowed_features",
      "available_at",
      "unavailable_at",
      "is_active",
      "production_days",
      "weight_in_grams",
      "length_cm",
      "height_cm",
      "width_cm",
      "image_url",
      "created_at",
      "updated_at",
    ],
  },

  // --- LOJA: VISUALIZAÇÃO GERAL ---
  // Feature: "shop:products:read_all"
  // Apenas leitura (ex: Dashboard de estoque), mas vê tudo.
  "shop:products:read_all": {
    allowedInputFields: ["search", "status", "category"],
    allowedOutputFields: [
      "id",
      "slug",
      "name",
      "price_in_cents",
      "stock_quantity",
      "is_active",
      "available_at",
      "unavailable_at",
    ],
  },

  // --- LOJA: CUPONS ---
  // Feature: "shop:coupons:manage"
  "shop:coupons:manage": {
    allowedInputFields: [
      "code",
      "description",
      "discount_percentage",
      "auto_apply_feature",
      "min_purchase_value_in_cents",
      "usage_limit_global",
      "usage_limit_per_user",
      "expiration_date",
      "is_active",
      "is_cumulative",
    ],
    allowedOutputFields: [
      "id",
      "code",
      "description",
      "usage_count",
      "created_at",
    ],
  },

  // --- LOJA: PEDIDOS ---
  // Feature: "shop:orders:manage"
  "shop:orders:manage": {
    allowedInputFields: ["status", "tracking_code"],
    allowedOutputFields: [
      "id",
      "status",
      "user_id",
      "total_in_cents",
      "updated_at",
    ],
  },

  // Feature: "shop:orders:read_all"
  "shop:orders:read_all": {
    allowedInputFields: ["status", "user_id", "date_range"],
    allowedOutputFields: [
      "id",
      "user_id",
      "status",
      "subtotal_in_cents",
      "total_in_cents",
      "payment_gateway_id",
      "shipping_address_snapshot",
      "created_at",
      "items",
    ],
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

    // A VERIFICAÇÃO DE "DONO" DA APRESENTAÇÃO FOI REMOVIDA DAQUI
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

  // --- LÓGICA DE FILTRAGEM ATUALIZADA ---
  // A lógica de leitura é especial:
  // "read:presentation" (padrão) e "read:presentation:admin" (mestra)
  // existem, mas usam perfis de saída diferentes.
  let profileFeature = feature;

  if (feature === "read:presentation") {
    // Se a feature for a de admin, use o perfil de admin (mais campos)
    if (user.features.includes("read:presentation:admin")) {
      profileFeature = "read:presentation:admin";
    }
    // Se não, "read:presentation" (padrão) já é o correto.
  }
  // --- FIM DA ATUALIZAÇÃO ---

  const profile = profiles[profileFeature];
  if (!profile || !profile.allowedOutputFields) {
    validateUser(user);
    validateFeature(feature);
    return {};
  }

  // MUDANÇA: A verificação 'can' agora acontece ANTES de filtrar.
  // Se a permissão for negada, retorna um objeto vazio, passando no teste.
  // (Para 'presentation', o 'can' não usa 'resource', então sempre passará)
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
