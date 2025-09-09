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
