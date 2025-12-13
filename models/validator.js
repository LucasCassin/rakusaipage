/**
 * This model handles the validation of objects based on defined schemas.
 * It uses Joi to validate and sanitize input data.
 */

import availableFeatures from "models/user-features.js";
import { ValidationError } from "errors/index.js";
import ERROR_MESSAGES from "models/error-messages.js";
import Joi from "joi";

/**
 * Validates an object based on the provided keys.
 * @param {Object} object - The object to be validated.
 * @param {Object} keys - The keys defining the validation schemas.
 * @returns {Object} - Returns the validated and sanitized object.
 * @throws {ValidationError} - Throws an error if validation fails.
 */
export default function validator(object, keys) {
  object = sanitizeObject(object);

  const schema = buildJoiSchema(keys);
  const { error, value } = schema.validate(object, {
    stripUnknown: true,
    context: { required: keys },
    errors: {
      escapeHtml: true,
      wrap: { array: false, string: '"' },
    },
  });

  if (error) {
    throw new ValidationError({
      message: error.details[0].message,
      action: error.details[0].context.label
        ? `Verifique o campo "${error.details[0].context.label}".`
        : null,
      cause: error,
    });
  }

  return value;
}

// Helper function to sanitize the input object.
function sanitizeObject(inputObject) {
  if (!inputObject || typeof inputObject !== "object") {
    throw new ValidationError(ERROR_MESSAGES.INVALID_JSON);
  }

  try {
    return JSON.parse(JSON.stringify(inputObject));
  } catch (error) {
    throw new ValidationError({
      ...ERROR_MESSAGES.INVALID_JSON,
      cause: error,
    });
  }
}

// Helper function to dynamically create schemas based on the provided keys.
function buildJoiSchema(validationKeys) {
  return Object.keys(validationKeys).reduce((combinedSchema, key) => {
    const schemaFunction = schemas[key];
    return combinedSchema.concat(schemaFunction());
  }, defaultSchema);
}

// Default Joi schema for all objects.
const defaultSchema = Joi.object().label("body").required().min(1).messages({
  "any.invalid": '{#label} possui o valor inválido "{#value}".',
  "any.only": "{#label} deve possuir um dos seguintes valores: {#valids}.",
  "any.required": "{#label} é um campo obrigatório.",
  "array.base": "{#label} deve ser do tipo Array.",
  "array.min": `{#label} deve possuir ao menos {#limit} {if(#limit==1, "elemento", "elementos")}.`,
  "boolean.base": "{#label} deve ser do tipo Boolean.",
  "date.base": "{#label} deve conter uma data válida.",
  "number.base": "{#label} deve ser do tipo Number.",
  "number.integer": "{#label} deve ser um Inteiro.",
  "number.max": "{#label} deve possuir um valor máximo de {#limit}.",
  "number.min": "{#label} deve possuir um valor mínimo de {#limit}.",
  "object.base": "{#label} enviado deve ser do tipo Object.",
  "object.min": "Objeto enviado deve ter no mínimo uma chave.",
  "string.alphanum": "{#label} deve conter apenas caracteres alfanuméricos.",
  "string.base": "{#label} deve ser do tipo String.",
  "string.email": "{#label} deve conter um email válido.",
  "string.empty": "{#label} não pode estar em branco.",
  "string.length":
    '{#label} deve possuir {#limit} {if(#limit==1, "caractere", "caracteres")}.',
  "string.ip": "{#label} deve possuir um IP válido.",
  "string.guid": "{#label} deve possuir um token UUID na versão 4.",
  "string.max":
    '{#label} deve conter no máximo {#limit} {if(#limit==1, "caractere", "caracteres")}.',
  "string.min":
    '{#label} deve conter no mínimo {#limit} {if(#limit==1, "caractere", "caracteres")}.',
  "username.reserved": "Este nome de usuário não está disponível para uso.",
  "string.pattern.base": "{#label} está no formato errado.",
});

// Joi schemas for each key.
const schemas = {
  id: () =>
    Joi.object({
      id: Joi.string()
        .trim()
        .guid({ version: "uuidv4" })
        .when("$required.id", {
          is: "required",
          then: Joi.required(),
          otherwise: Joi.optional().allow(null),
        }),
    }),

  username: () =>
    Joi.object({
      username: Joi.string()
        .alphanum()
        .min(3)
        .max(30)
        .trim()
        .custom(checkReservedUsernames, "check if username is reserved")
        .when("$required.username", {
          is: "required",
          then: Joi.required(),
          otherwise: Joi.optional(),
        }),
    }),

  email: () =>
    Joi.object({
      email: Joi.string()
        .email()
        .min(7)
        .max(254)
        .lowercase()
        .trim()
        .when("$required.email", {
          is: "required",
          then: Joi.required(),
          otherwise: Joi.optional(),
        }),
    }),

  password: () =>
    Joi.object({
      password: Joi.string()
        .min(8)
        .max(60)
        .trim()
        .pattern(
          /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
          "password complexity",
        )
        .messages({
          "string.pattern.name":
            '"password" deve conter pelo menos 1 letra maiúscula, 1 letra minúscula, 1 número e 1 caractere especial.',
        })
        .when("$required.password", {
          is: "required",
          then: Joi.required(),
          otherwise: Joi.optional(),
        }),
    }),

  features: () =>
    Joi.object({
      features: Joi.array()
        .when("$required.features", {
          is: "required",
          then: Joi.required(),
          otherwise: Joi.optional(),
        })
        .items(Joi.string().valid(...availableFeatures))
        .messages({
          "any.only": '"{#value}" não é uma feature válida.',
        }),
    }),

  session_id: () =>
    Joi.object({
      session_id: Joi.string()
        .trim()
        .guid({ version: "uuidv4" })
        .when("$required.session_id", {
          is: "required",
          then: Joi.required(),
          otherwise: Joi.optional(),
        }),
    }),

  token: () =>
    Joi.object({
      token: Joi.string().length(96).alphanum().when("$required.token", {
        is: "required",
        then: Joi.required(),
        otherwise: Joi.optional(),
      }),
    }),

  token_model: () =>
    Joi.object({
      token_model: Joi.string().length(64).alphanum().when("$required.token", {
        is: "required",
        then: Joi.required(),
        otherwise: Joi.optional(),
      }),
    }),

  created_at: () =>
    Joi.object({
      created_at: Joi.date().when("$required.created_at", {
        is: "required",
        then: Joi.required(),
        otherwise: Joi.optional(),
      }),
    }),

  updated_at: () =>
    Joi.object({
      updated_at: Joi.date().when("$required.updated_at", {
        is: "required",
        then: Joi.required(),
        otherwise: Joi.optional(),
      }),
    }),

  expires_at: () =>
    Joi.object({
      expires_at: Joi.date().when("$required.expires_at", {
        is: "required",
        then: Joi.required(),
        otherwise: Joi.optional().allow(null),
      }),
    }),

  password_expires_at: () =>
    Joi.object({
      password_expires_at: Joi.date().when("$required.expires_at", {
        is: "required",
        then: Joi.required(),
        otherwise: Joi.optional().allow(null),
      }),
    }),

  user: () =>
    Joi.object()
      .concat(schemas.id())
      .concat(schemas.created_at())
      .concat(schemas.updated_at())
      .concat(schemas.username())
      .concat(schemas.features()),

  user_id: () =>
    Joi.object({
      user_id: Joi.string()
        .trim()
        .guid({ version: "uuidv4" })
        .when("$required.id", {
          is: "required",
          then: Joi.required(),
          otherwise: Joi.optional().allow(null),
        }),
    }),

  content: () =>
    Joi.object({
      content: Joi.string()
        .trim()
        .min(1)
        .max(2000) // Limite de 2000 caracteres para um comentário
        .when("$required.content", {
          is: "required",
          then: Joi.required(),
          otherwise: Joi.optional(),
        }),
    }),

  video_id: () =>
    Joi.object({
      video_id: Joi.string()
        .trim()
        .min(1)
        .max(255) // Um tamanho seguro para IDs de vídeo ou 'mural'
        .when("$required.video_id", {
          is: "required",
          then: Joi.required(),
          otherwise: Joi.optional(),
        }),
    }),

  parent_id: () =>
    Joi.object({
      parent_id: Joi.string()
        .trim()
        .guid({ version: "uuidv4" })
        .when("$required.parent_id", {
          is: "required",
          then: Joi.required(),
          otherwise: Joi.optional().allow(null),
        }),
    }),

  comment_id: () =>
    Joi.object({
      comment_id: Joi.string()
        .trim()
        .guid({ version: "uuidv4" })
        .when("$required.comment_id", {
          is: "required",
          then: Joi.required(),
          otherwise: Joi.optional(),
        }),
    }),

  return_list: () =>
    Joi.object({
      return_list: Joi.boolean().when("$required.return_list", {
        is: "required",
        then: Joi.required(),
        otherwise: Joi.optional(),
      }),
    }),

  name: () =>
    // Schema genérico para nomes/títulos
    Joi.object({
      name: Joi.string().trim().min(3).max(255).when("$required.name", {
        is: "required",
        then: Joi.required(),
        otherwise: Joi.optional(),
      }),
    }),

  description: () =>
    // Schema genérico para descrições
    Joi.object({
      description: Joi.string()
        .trim()
        .max(5000) // Um limite generoso para descrições
        .when("$required.description", {
          is: "required",
          then: Joi.required(),
          otherwise: Joi.optional().allow(null, ""),
        }),
    }),

  full_value: () =>
    // Para valores monetários
    Joi.object({
      full_value: Joi.number()
        .precision(2) // Garante 2 casas decimais
        .positive() // O valor não pode ser negativo
        .when("$required.full_value", {
          is: "required",
          then: Joi.required(),
          otherwise: Joi.optional(),
        }),
    }),

  period_unit: () =>
    // Para a unidade de período do plano
    Joi.object({
      period_unit: Joi.string()
        .trim()
        .valid("day", "week", "month", "year") // Valida contra a lista do ENUM
        .when("$required.period_unit", {
          is: "required",
          then: Joi.required(),
          otherwise: Joi.optional(),
        }),
    }),

  period_value: () =>
    // Para o valor do período do plano
    Joi.object({
      period_value: Joi.number()
        .integer()
        .min(1) // O período deve ser de no mínimo 1 (1 dia, 1 mês, etc.)
        .when("$required.period_value", {
          is: "required",
          then: Joi.required(),
          otherwise: Joi.optional(),
        }),
    }),

  plan_id: () =>
    // Referência ao ID de um plano
    Joi.object({
      plan_id: Joi.string()
        .trim()
        .guid({ version: "uuidv4" })
        .when("$required.plan_id", {
          is: "required",
          then: Joi.required(),
          otherwise: Joi.optional(),
        }),
    }),

  discount_value: () =>
    // Para valor de desconto
    Joi.object({
      discount_value: Joi.number()
        .precision(2)
        .min(0) // O desconto não pode ser negativo
        .when("$required.discount_value", {
          is: "required",
          then: Joi.required(),
          otherwise: Joi.optional(),
        }),
    }),

  payment_day: () =>
    // Para o dia do pagamento
    Joi.object({
      payment_day: Joi.number()
        .integer()
        .min(1)
        .max(31) // Um dia de pagamento válido
        .when("$required.payment_day", {
          is: "required",
          then: Joi.required(),
          otherwise: Joi.optional(),
        }),
    }),

  start_date: () =>
    // Para datas
    Joi.object({
      start_date: Joi.date()
        .iso() // Garante o formato 'YYYY-MM-DD'
        .when("$required.start_date", {
          is: "required",
          then: Joi.required(),
          otherwise: Joi.optional(),
        }),
    }),

  subscription_id: () =>
    // Referência ao ID de uma assinatura
    Joi.object({
      subscription_id: Joi.string()
        .trim()
        .guid({ version: "uuidv4" })
        .when("$required.subscription_id", {
          is: "required",
          then: Joi.required(),
          otherwise: Joi.optional(),
        }),
    }),

  due_date: () =>
    // Para a data de vencimento de um pagamento
    Joi.object({
      due_date: Joi.date()
        .iso() // Garante o formato 'YYYY-MM-DD'
        .when("$required.due_date", {
          is: "required",
          then: Joi.required(),
          otherwise: Joi.optional(),
        }),
    }),

  amount_due: () =>
    // Para o valor a ser pago em uma cobrança
    Joi.object({
      amount_due: Joi.number()
        .precision(2)
        .min(0) // O valor a pagar não pode ser negativo
        .when("$required.amount_due", {
          is: "required",
          then: Joi.required(),
          otherwise: Joi.optional(),
        }),
    }),

  status: () =>
    // Para o status de um pagamento
    Joi.object({
      status: Joi.string()
        .trim()
        .valid("PENDING", "CONFIRMED", "OVERDUE") // Valida contra a lista do ENUM
        .when("$required.status", {
          is: "required",
          then: Joi.required(),
          otherwise: Joi.optional(),
        }),
    }),

  user_notified_payment: () =>
    // Para o booleano de notificação do usuário
    Joi.object({
      user_notified_payment: Joi.boolean().when(
        "$required.user_notified_payment",
        {
          is: "required",
          then: Joi.required(),
          otherwise: Joi.optional(),
        },
      ),
    }),

  is_active: () =>
    // Para o booleano de status de uma assinatura
    Joi.object({
      is_active: Joi.boolean().when("$required.is_active", {
        is: "required",
        then: Joi.required(),
        otherwise: Joi.optional(),
      }),
    }),

  action: () =>
    // Para ações
    Joi.object({
      action: Joi.string()
        .trim()
        .valid("confirm_paid", "indicate_paid")
        .when("$required.is_active", {
          is: "required",
          then: Joi.required(),
          otherwise: Joi.optional(),
        }),
    }),

  presentation_id: () =>
    // Referência ao ID de uma apresentação
    Joi.object({
      presentation_id: Joi.string()
        .trim()
        .guid({ version: "uuidv4" })
        .when("$required.presentation_id", {
          is: "required",
          then: Joi.required(),
          otherwise: Joi.optional(),
        }),
    }),

  date: () =>
    // Schema genérico para datas
    Joi.object({
      date: Joi.date()
        .iso()
        .when("$required.date", {
          is: "required",
          then: Joi.required(),
          otherwise: Joi.optional().allow(null),
        }),
    }),

  location: () =>
    // Schema genérico para localizações/strings curtas
    Joi.object({
      location: Joi.string()
        .trim()
        .min(1)
        .max(255)
        .when("$required.location", {
          is: "required",
          then: Joi.required(),
          otherwise: Joi.optional().allow(null, ""),
        }),
    }),

  meet_time: () =>
    // Schema para horários de encontro
    Joi.object({
      meet_time: Joi.date()
        .iso()
        .when("$required.meet_time", {
          is: "required",
          then: Joi.required(),
          otherwise: Joi.optional().allow(null),
        }),
    }),

  meet_location: () =>
    // Schema genérico para localizações/strings curtas
    Joi.object({
      meet_location: Joi.string()
        .trim()
        .min(1)
        .max(255)
        .when("$required.meet_location", {
          is: "required",
          then: Joi.required(),
          otherwise: Joi.optional().allow(null, ""),
        }),
    }),

  is_public: () =>
    // Para o booleano de visibilidade
    Joi.object({
      is_public: Joi.boolean().when("$required.is_public", {
        is: "required",
        then: Joi.required(),
        otherwise: Joi.optional(),
      }),
    }),

  order: () =>
    // Para ordenação de cenas/passos
    Joi.object({
      order: Joi.number().integer().min(0).when("$required.order", {
        is: "required",
        then: Joi.required(),
        otherwise: Joi.optional(),
      }),
    }),

  newOrder: () =>
    // Para ordenação de cenas/passos
    Joi.object({
      newOrder: Joi.number().integer().min(0).when("$required.newOrder", {
        is: "required",
        then: Joi.required(),
        otherwise: Joi.optional(),
      }),
    }),

  scene_type: () =>
    Joi.object({
      scene_type: Joi.string()
        .trim()
        .valid("FORMATION", "TRANSITION")
        .when("$required.scene_type", {
          is: "required",
          then: Joi.required(),
          otherwise: Joi.optional(),
        }),
    }),

  pasteOption: () =>
    Joi.object({
      pasteOption: Joi.string()
        .trim()
        .valid("elements_only", "with_names", "with_users")
        .when("$required.pasteOption", {
          is: "required",
          then: Joi.required(),
          otherwise: Joi.optional(),
        }),
    }),

  scene_id: () =>
    // Referência ao ID de uma cena
    Joi.object({
      scene_id: Joi.string()
        .trim()
        .guid({ version: "uuidv4" })
        .when("$required.scene_id", {
          is: "required",
          then: Joi.required(),
          otherwise: Joi.optional(),
        }),
    }),

  scene_ids: () =>
    Joi.object({
      scene_ids: Joi.array()
        .items(
          Joi.string().trim().guid({ version: "uuidv4" }), // O item é apenas a string
        )
        .min(0)
        .when("$required.scene_ids", {
          is: "required",
          then: Joi.required(),
          otherwise: Joi.optional(),
        }),
    }),

  element_type_id: () =>
    // Referência ao ID de um tipo de elemento
    Joi.object({
      element_type_id: Joi.string()
        .trim()
        .guid({ version: "uuidv4" })
        .when("$required.element_type_id", {
          is: "required",
          then: Joi.required(),
          otherwise: Joi.optional(),
        }),
    }),

  position_x: () =>
    // Coordenada X
    Joi.object({
      position_x: Joi.number()
        .precision(2) // Permite casas decimais para %
        .min(0)
        .max(100) // Assumindo que é porcentagem
        .when("$required.position_x", {
          is: "required",
          then: Joi.required(),
          otherwise: Joi.optional(),
        }),
    }),

  position_y: () =>
    // Coordenada Y
    Joi.object({
      position_y: Joi.number()
        .precision(2)
        .min(0)
        .max(100)
        .when("$required.position_y", {
          is: "required",
          then: Joi.required(),
          otherwise: Joi.optional(),
        }),
    }),

  display_name: () =>
    // Nome de exibição (ex: "Lucas")
    Joi.object({
      display_name: Joi.string()
        .trim()
        .min(1)
        .max(50)
        .when("$required.display_name", {
          is: "required",
          then: Joi.required(),
          otherwise: Joi.optional().allow(null, ""),
        }),
    }),

  // assigned_user_id: () =>
  //   // ID do usuário associado (opcional)
  //   Joi.object({
  //     assigned_user_id: Joi.string()
  //       .trim()
  //       .guid({ version: "uuidv4" })
  //       .when("$required.assigned_user_id", {
  //         is: "required",
  //         then: Joi.required(),
  //         otherwise: Joi.optional().allow(null), // Permite ser nulo
  //       }),
  //   }),

  assignees: () =>
    // Array de IDs de usuários associados (opcional)
    Joi.object({
      assignees: Joi.array()
        .items(
          Joi.string().trim().guid({ version: "uuidv4" }), // Valida cada item como UUID
        )
        .min(0) // Permite um array vazio []
        .when("$required.assignees", {
          is: "required",
          then: Joi.required(), // Se for obrigatório, deve ter ao menos 1
          otherwise: Joi.optional().allow(null), // Permite ser undefined ou null
        }),
    }),

  group_id: () =>
    // Referência ao ID de um grupo de elementos
    Joi.object({
      group_id: Joi.string()
        .trim()
        .guid({ version: "uuidv4" })
        .when("$required.group_id", {
          is: "required",
          then: Joi.required(),
          otherwise: Joi.optional(),
        }),
    }),

  targetGroupId: () =>
    // Referência ao ID do grupo alvo
    Joi.object({
      targetGroupId: Joi.string()
        .trim()
        .guid({ version: "uuidv4" })
        .when("$required.targetGroupId", {
          is: "required",
          then: Joi.required(),
          otherwise: Joi.optional(),
        }),
    }),

  sourceGroupId: () =>
    // Referência ao ID do grupo fonte
    Joi.object({
      sourceGroupId: Joi.string()
        .trim()
        .guid({ version: "uuidv4" })
        .when("$required.sourceGroupId", {
          is: "required",
          then: Joi.required(),
          otherwise: Joi.optional(),
        }),
    }),

  targetPresentationId: () =>
    // Referência ao ID do grupo fonte
    Joi.object({
      targetPresentationId: Joi.string()
        .trim()
        .guid({ version: "uuidv4" })
        .when("$required.targetPresentationId", {
          is: "required",
          then: Joi.required(),
          otherwise: Joi.optional(),
        }),
    }),

  sourceSceneId: () =>
    // Referência ao ID do grupo fonte
    Joi.object({
      sourceSceneId: Joi.string()
        .trim()
        .guid({ version: "uuidv4" })
        .when("$required.sourceSceneId", {
          is: "required",
          then: Joi.required(),
          otherwise: Joi.optional(),
        }),
    }),

  scale: () =>
    // Para escala
    Joi.object({
      scale: Joi.number().precision(2).min(0).max(100).when("$required.scale", {
        is: "required",
        then: Joi.required(),
        otherwise: Joi.optional(),
      }),
    }),

  image_url: () =>
    // URL para imagens de ícones
    Joi.object({
      image_url: Joi.string()
        .trim()
        .min(5)
        .max(500)
        .when("$required.image_url", {
          is: "required",
          then: Joi.required(),
          otherwise: Joi.optional(),
        }),
    }),

  image_url_highlight: () =>
    // URL para imagens de ícones
    Joi.object({
      image_url: Joi.string()
        .trim()
        .min(5)
        .max(500)
        .when("$required.image_url", {
          is: "required",
          then: Joi.required(),
          otherwise: Joi.optional(),
        }),
    }),

  // sceneData: () =>
  //   Joi.object().concat(schemas.presentation_id()).concat(schemas.id()),
  sceneData: () =>
    // URL para imagens de ícones
    Joi.object({
      sceneData: Joi.object().when("$required.sceneData", {
        is: "required",
        then: Joi.required(),
        otherwise: Joi.optional(),
      }),
    }),

  slug: () =>
    Joi.object({
      slug: Joi.string()
        .pattern(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
        .min(3)
        .max(255)
        .when("$required.slug", {
          is: "required",
          then: Joi.required(),
          otherwise: Joi.optional(),
        }),
    }),

  category: () =>
    Joi.object({
      category: Joi.string().trim().max(100).when("$required.category", {
        is: "required",
        then: Joi.required(),
        otherwise: Joi.optional(),
      }),
    }),

  tags: () =>
    Joi.object({
      tags: Joi.array()
        .items(Joi.string().trim().max(50))
        .unique()
        .when("$required.tags", {
          is: "required",
          then: Joi.required(),
          otherwise: Joi.optional(),
        }),
    }),

  price_in_cents: () =>
    Joi.object({
      price_in_cents: Joi.number()
        .integer()
        .min(0)
        .when("$required.price_in_cents", {
          is: "required",
          then: Joi.required(),
          otherwise: Joi.optional(),
        }),
    }),

  promotional_price_in_cents: () =>
    Joi.object({
      promotional_price_in_cents: Joi.number()
        .integer()
        .min(0)
        .allow(null)
        .when("$required.promotional_price_in_cents", {
          is: "required",
          then: Joi.required(),
          otherwise: Joi.optional(),
        }),
    }),

  minimum_price_in_cents: () =>
    Joi.object({
      minimum_price_in_cents: Joi.number()
        .integer()
        .min(0)
        .when("$required.minimum_price_in_cents", {
          is: "required",
          then: Joi.required(),
          otherwise: Joi.optional(),
        }),
    }),

  stock_quantity: () =>
    Joi.object({
      stock_quantity: Joi.number()
        .integer()
        .min(0)
        .when("$required.stock_quantity", {
          is: "required",
          then: Joi.required(),
          otherwise: Joi.optional(),
        }),
    }),

  cart_quantity: () =>
    Joi.object({
      cart_quantity: Joi.number()
        .integer()
        .min(1)
        .when("$required.cart_quantity", {
          is: "required",
          then: Joi.required(),
          otherwise: Joi.optional(),
        }),
    }),

  purchase_limit_per_user: () =>
    Joi.object({
      purchase_limit_per_user: Joi.number()
        .integer()
        .min(1)
        .allow(null)
        .when("$required.purchase_limit_per_user", {
          is: "required",
          then: Joi.required(),
          otherwise: Joi.optional(),
        }),
    }),

  // Logística
  weight_in_grams: () =>
    Joi.object({
      weight_in_grams: Joi.number()
        .integer()
        .min(0)
        .when("$required.weight_in_grams", {
          is: "required",
          then: Joi.required(),
          otherwise: Joi.optional(),
        }),
    }),

  length_cm: () =>
    Joi.object({
      length_cm: Joi.number().integer().min(1).when("$required.length_cm", {
        is: "required",
        then: Joi.required(),
        otherwise: Joi.optional(),
      }),
    }),

  height_cm: () =>
    Joi.object({
      height_cm: Joi.number().integer().min(1).when("$required.height_cm", {
        is: "required",
        then: Joi.required(),
        otherwise: Joi.optional(),
      }),
    }),

  width_cm: () =>
    Joi.object({
      width_cm: Joi.number().integer().min(1).when("$required.width_cm", {
        is: "required",
        then: Joi.required(),
        otherwise: Joi.optional(),
      }),
    }),

  production_days: () =>
    Joi.object({
      production_days: Joi.number()
        .integer()
        .min(0)
        .when("$required.production_days", {
          is: "required",
          then: Joi.required(),
          otherwise: Joi.optional(),
        }),
    }),

  // Datas e Flags
  available_at: () =>
    Joi.object({
      available_at: Joi.date()
        .iso()
        .allow(null)
        .when("$required.available_at", {
          is: "required",
          then: Joi.required(),
          otherwise: Joi.optional(),
        }),
    }),

  unavailable_at: () =>
    Joi.object({
      unavailable_at: Joi.date()
        .iso()
        .allow(null)
        .when("$required.unavailable_at", {
          is: "required",
          then: Joi.required(),
          otherwise: Joi.optional(),
        }),
    }),

  allowed_features: () =>
    Joi.object({
      allowed_features: Joi.array()
        .items(Joi.string())
        .when("$required.allowed_features", {
          is: "required",
          then: Joi.required(),
          otherwise: Joi.optional(),
        }),
    }),

  code: () =>
    Joi.object({
      code: Joi.string()
        .trim()
        .uppercase()
        .min(3)
        .max(50)
        .when("$required.code", {
          is: "required",
          then: Joi.required(),
          otherwise: Joi.optional(),
        }),
    }),

  discount_percentage: () =>
    Joi.object({
      discount_percentage: Joi.number()
        .integer()
        .min(0)
        .max(100)
        .when("$required.discount_percentage", {
          is: "required",
          then: Joi.required(),
          otherwise: Joi.optional(),
        }),
    }),

  auto_apply_feature: () =>
    Joi.object({
      auto_apply_feature: Joi.string()
        .allow(null)
        .when("$required.auto_apply_feature", {
          is: "required",
          then: Joi.required(),
          otherwise: Joi.optional(),
        }),
    }),

  min_purchase_value_in_cents: () =>
    Joi.object({
      min_purchase_value_in_cents: Joi.number()
        .integer()
        .min(0)
        .when("$required.min_purchase_value_in_cents", {
          is: "required",
          then: Joi.required(),
          otherwise: Joi.optional(),
        }),
    }),

  usage_limit_global: () =>
    Joi.object({
      usage_limit_global: Joi.number()
        .integer()
        .min(1)
        .allow(null)
        .when("$required.usage_limit_global", {
          is: "required",
          then: Joi.required(),
          otherwise: Joi.optional(),
        }),
    }),

  usage_limit_per_user: () =>
    Joi.object({
      usage_limit_per_user: Joi.number()
        .integer()
        .min(1)
        .allow(null)
        .when("$required.usage_limit_per_user", {
          is: "required",
          then: Joi.required(),
          otherwise: Joi.optional(),
        }),
    }),

  is_cumulative: () =>
    Joi.object({
      is_cumulative: Joi.boolean().when("$required.is_cumulative", {
        is: "required",
        then: Joi.required(),
        otherwise: Joi.optional(),
      }),
    }),

  expiration_date: () =>
    Joi.object({
      expiration_date: Joi.date()
        .iso()
        .allow(null)
        .when("$required.expiration_date", {
          is: "required",
          then: Joi.required(),
          otherwise: Joi.optional(),
        }),
    }),

  shop_status: () =>
    Joi.object({
      shop_status: Joi.string()
        .valid(
          "pending",
          "paid",
          "preparing",
          "shipped",
          "delivered",
          "canceled",
          "refunded",
        )
        .when("$required.shop_status", {
          is: "required",
          then: Joi.required(),
          otherwise: Joi.optional(),
        }),
    }),

  tracking_code: () =>
    Joi.object({
      tracking_code: Joi.string()
        .allow(null, "")
        .when("$required.tracking_code", {
          is: "required",
          then: Joi.required(),
          otherwise: Joi.optional(),
        }),
    }),

  payment_method: () =>
    Joi.object({
      payment_method: Joi.string()
        .valid("pix")
        .when("$required.payment_method", {
          is: "required",
          then: Joi.required(),
          otherwise: Joi.optional(),
        }),
    }),

  // Campos de totais para validação interna ou updates
  total_in_cents: () =>
    Joi.object({
      total_in_cents: Joi.number()
        .integer()
        .min(0)
        .when("$required.total_in_cents", {
          is: "required",
          then: Joi.required(),
          otherwise: Joi.optional(),
        }),
    }),

  subtotal_in_cents: () =>
    Joi.object({
      subtotal_in_cents: Joi.number()
        .integer()
        .min(0)
        .when("$required.subtotal_in_cents", {
          is: "required",
          then: Joi.required(),
          otherwise: Joi.optional(),
        }),
    }),

  shipping_cost_in_cents: () =>
    Joi.object({
      shipping_cost_in_cents: Joi.number()
        .integer()
        .min(0)
        .when("$required.shipping_cost_in_cents", {
          is: "required",
          then: Joi.required(),
          otherwise: Joi.optional(),
        }),
    }),

  discount_in_cents: () =>
    Joi.object({
      discount_in_cents: Joi.number()
        .integer()
        .min(0)
        .when("$required.discount_in_cents", {
          is: "required",
          then: Joi.required(),
          otherwise: Joi.optional(),
        }),
    }),

  limit: () =>
    Joi.object({
      limit: Joi.number().integer().min(0).when("$required.limit", {
        is: "required",
        then: Joi.required(),
        otherwise: Joi.optional(),
      }),
    }),

  offset: () =>
    Joi.object({
      offset: Joi.number().integer().min(0).when("$required.offset", {
        is: "required",
        then: Joi.required(),
        otherwise: Joi.optional(),
      }),
    }),

  // Objetos complexos (JSONB snapshots)
  shipping_address_snapshot: () =>
    Joi.object({
      shipping_address_snapshot: Joi.object()
        .unknown(true)
        .when("$required.shipping_address_snapshot", {
          is: "required",
          then: Joi.required(),
          otherwise: Joi.optional(),
        }),
    }),

  shop_items: () =>
    Joi.object({
      shop_items: Joi.array()
        .items(
          Joi.object({
            product_id: Joi.string().guid({ version: "uuidv4" }).required(),
            quantity: Joi.number().integer().min(1).required(),
          }),
        )
        .when("$required.items", {
          is: "required",
          then: Joi.required(),
          otherwise: Joi.optional(),
        }),
    }),

  payment_gateway_id: () =>
    Joi.object({
      payment_gateway_id: Joi.string()
        .allow(null)
        .when("$required.payment_gateway_id", {
          is: "required",
          then: Joi.required(),
          otherwise: Joi.optional(),
        }),
    }),

  shop_images: () =>
    Joi.object({
      shop_images: Joi.array()
        .items(
          Joi.object({
            url: Joi.string().uri().required(),
            alt: Joi.string().allow("").optional(),
            is_cover: Joi.boolean().default(false),
          }),
        )
        .min(0)
        .max(10)
        .when("$required.images", {
          is: "required",
          then: Joi.required(),
          otherwise: Joi.optional(),
        }),
    }),

  product_id: () =>
    Joi.object({
      product_id: Joi.string()
        .trim()
        .guid({ version: "uuidv4" })
        .when("$required.product_id", {
          is: "required",
          then: Joi.required(),
          otherwise: Joi.optional().allow(null),
        }),
    }),

  gatewayId: () =>
    Joi.object({
      gatewayId: Joi.string()
        .trim()
        .pattern(/^\d+$/, "numbers_only") // Valida se tem apenas números
        .min(1)
        .max(50) // Limite seguro
        .when("$required.gatewayId", {
          is: "required",
          then: Joi.required(),
          otherwise: Joi.optional().allow(null),
        }),
    }),

  gatewayData: () =>
    // Para armazenar o JSON bruto retornado pelo MP (metadata, qr code, etc)
    Joi.object({
      gatewayData: Joi.object()
        .unknown(true) // Permite qualquer estrutura interna de chaves/valores
        .when("$required.gatewayData", {
          is: "required",
          then: Joi.required(),
          otherwise: Joi.optional().allow(null),
        }),
    }),

  gatewayStatus: () =>
    // Status específicos do Mercado Pago (diferente do seu status interno)
    Joi.object({
      gatewayStatus: Joi.string().trim().when("$required.gatewayStatus", {
        is: "required",
        then: Joi.required(),
        otherwise: Joi.optional(),
      }),
    }),

  allow_delivery: () =>
    Joi.object({
      allow_delivery: Joi.boolean().when("$required.allow_delivery", {
        is: "required",
        then: Joi.required(),
        otherwise: Joi.optional(),
      }),
    }),

  allow_pickup: () =>
    Joi.object({
      allow_pickup: Joi.boolean().when("$required.allow_pickup", {
        is: "required",
        then: Joi.required(),
        otherwise: Joi.optional(),
      }),
    }),

  pickup_address: () =>
    Joi.object({
      pickup_address: Joi.string().min(10).when("$required.pickup_address", {
        is: "required",
        then: Joi.required(),
        otherwise: Joi.optional(),
      }),
    }),

  pickup_instructions: () =>
    Joi.object({
      pickup_instructions: Joi.string()
        .min(10)
        .when("$required.pickup_instructions", {
          is: "required",
          then: Joi.required(),
          otherwise: Joi.optional(),
        }),
    }),

  shipping_method: () =>
    Joi.object({
      shipping_method: Joi.string()
        .min(3)
        .max(50)
        .when("$required.shipping_method", {
          is: "required",
          then: Joi.required(),
          otherwise: Joi.optional(),
        }),
    }),

  zip_code: () =>
    Joi.object({
      zip_code: Joi.string()
        // Regex exemplo para CEP (8 dígitos, com ou sem traço: 12345-678 ou 12345678)
        .pattern(/^\d{5}-?\d{3}$/)
        .when("$required.zip_code", {
          is: "required",
          then: Joi.required(),
          otherwise: Joi.optional(),
        }),
    }),

  shipping_details: () =>
    Joi.object({
      shipping_details: Joi.object()
        .unknown(true)
        .when("$required.shipping_details", {
          is: "required",
          then: Joi.required(),
          otherwise: Joi.optional(),
        }),
    }),
};

// Helper function to check if the username is reserved.
function checkReservedUsernames(username, helpers) {
  const normalizedUsername = username.toLowerCase();
  if (
    reservedDevUsernames.includes(normalizedUsername) ||
    reservedUsernames.includes(normalizedUsername) ||
    reservedUsernamesStartingWith.some((reserved) =>
      normalizedUsername.startsWith(reserved),
    )
  ) {
    return helpers.error("username.reserved");
  }
  return username;
}

const reservedDevUsernames = ["admin", "user"];
const reservedUsernamesStartingWith = ["favicon", "manifest"];
const reservedUsernames = [
  "account",
  "administracao",
  "administrador",
  "administradora",
  "administradores",
  "administrator",
  "afiliado",
  "afiliados",
  "ajuda",
  "alerta",
  "alertas",
  "all",
  "analytics",
  "anonymous",
  "anunciar",
  "anuncie",
  "anuncio",
  "anuncios",
  "api",
  "app",
  "apps",
  "autenticacao",
  "auth",
  "authentication",
  "autorizacao",
  "avatar",
  "backup",
  "banner",
  "banners",
  "beta",
  "blog",
  "cadastrar",
  "cadastro",
  "carrinho",
  "categoria",
  "categorias",
  "categories",
  "category",
  "ceo",
  "cfo",
  "checkout",
  "classificados",
  "comentario",
  "comentarios",
  "compartilhada",
  "compartilhadas",
  "compartilhado",
  "compartilhados",
  "comunidade",
  "comunidades",
  "config",
  "configuracao",
  "configuracoes",
  "configurar",
  "configure",
  "conta",
  "contas",
  "contato",
  "contatos",
  "content",
  "conteudos",
  "contrato",
  "convite",
  "convites",
  "create",
  "criar",
  "css",
  "cto",
  "cultura",
  "curso",
  "cursos",
  "dados",
  "dashboard",
  "desconectar",
  "descricao",
  "description",
  "deslogar",
  "diretrizes",
  "discussao",
  "docs",
  "documentacao",
  "download",
  "downloads",
  "draft",
  "edit",
  "editar",
  "editor",
  "email",
  "estatisticas",
  "eu",
  "faq",
  "features",
  "gerente",
  "grupo",
  "grupos",
  "guest",
  "guidelines",
  "hoje",
  "imagem",
  "imagens",
  "init",
  "interface",
  "licenca",
  "log",
  "login",
  "logout",
  "loja",
  "me",
  "membership",
  "moderacao",
  "moderador",
  "moderadora",
  "moderadoras",
  "moderadores",
  "museu",
  "news",
  "newsletter",
  "newsletters",
  "notificacoes",
  "notification",
  "notifications",
  "ontem",
  "pagina",
  "password",
  "patrocinada",
  "patrocinadas",
  "patrocinado",
  "patrocinados",
  "perfil",
  "pesquisa",
  "popular",
  "post",
  "postar",
  "posts",
  "preferencias",
  "promoted",
  "promovida",
  "promovidas",
  "promovido",
  "promovidos",
  "public",
  "publicar",
  "publish",
  "rascunho",
  "recentes",
  "register",
  "registration",
  "regras",
  "relatorio",
  "relatorios",
  "replies",
  "reply",
  "resetar-senha",
  "resetar",
  "resposta",
  "respostas",
  "root",
  "rootuser",
  "rss",
  "sair",
  "senha",
  "sobre",
  "sponsored",
  "status",
  "sudo",
  "superuser",
  "suporte",
  "support",
  "swr",
  "sysadmin",
  "tabnew",
  "tabnews",
  "tag",
  "tags",
  "termos-de-uso",
  "termos",
  "terms",
  "toc",
  "todos",
  "trending",
  "upgrade",
  "username",
  "users",
  "usuario",
  "usuarios",
  "va",
  "vagas",
  "videos",
];
