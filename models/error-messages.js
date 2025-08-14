const ERROR_MESSAGES = {
  // Generic messages
  INTERNAL_SERVER_ERROR: {
    message: "Erro interno no servidor.",
  },
  INVALID_JSON: {
    message: "Não foi possível interpretar o valor enviado.",
    action: "Verifique se o valor enviado é um JSON válido.",
  },

  // Authentication messages
  USER_NOT_FOUND: {
    message: "Usuário não encontrado.",
    action: "Verifique se este usuário existe e tente novamente.",
  },
  PASSWORD_MISMATCH: {
    message: "A senha informada não confere com a senha do usuário.",
    action: "Verifique se a senha informada está correta e tente novamente.",
  },
  INVALID_TOKEN: {
    message: "Token inválido.",
    statusCode: 401,
  },
  NO_ACTIVE_SESSION: {
    message: "Usuário não possui sessão ativa.",
    action: "Verifique se este usuário está logado.",
    statusCode: 401,
  },
  DATA_MISMATCH: {
    message: `Dados não conferem.`,
    action: `Verifique se os dados enviados estão corretos.`,
  },
  FORBIDDEN_CREATE_SESSION: {
    message: `Você não possui permissão para fazer login.`,
    action: `Verifique se este usuário possui a feature "create:session".`,
  },

  // Authorization messages
  UNAUTHORIZED_OPERATION: {
    message: `Usuário não pode executar esta operação.`,
    action: `Verifique se o usuário está logado e possui as permissões necessárias.`,
    statusCode: 403,
  },
  PERMISSION_DENIED: {
    message: "Você não possui permissão para executar esta ação.",
    action:
      'Verifique se este usuário possui a feature "read:session:self" ou se a sessão realmente é do usuário ativo.',
    statusCode: 403,
  },
  FORBIDDEN_READ_USER: {
    message: `Usuário não pode executar esta operação.`,
    action: `Verifique se o usuário está logado e possui uma das features "read:user:self" ou "read:user:other".`,
  },
  FORBIDDEN_UPDATE_USER: {
    message: `Usuário não pode executar esta operação.`,
    action: `Verifique se o usuário está logado e possui uma das features "update:user:self", "update:user:other", "update:user:features:self" ou "update:user:features:self".`,
  },
  CAN_REQUEST_FORBIDDEN: (feature) => ({
    message: `Usuário não pode executar esta operação.`,
    action: `Verifique se este usuário possui a feature "${feature}".`,
  }),

  // Session messages
  SESSION_EXPIRED: {
    message: "A sessão expirou.",
    action: "Faça login novamente para continuar.",
    statusCode: 401,
  },

  // Validation messages
  INVALID_USER: {
    message: `Nenhum "user" foi especificado para a ação de autorização.`,
    action: `Contate o suporte informado o campo "authorizationValidate".`,
  },
  INVALID_FEATURE: {
    message: `Nenhuma "feature" foi especificada para a ação de autorização.`,
    action: `Contate o suporte informado o campo "authorizationValidate".`,
  },
  INVALID_FEATURE_FROM_USER: {
    message: `"user" não possui "features" ou não é um array.`,
    action: `Contate o suporte informado o campo "authorizationValidate".`,
  },
  INVALID_INPUT: {
    message: `Nenhum "input" foi especificado para a ação de filtro.`,
    action: `Contate o suporte informado o campo "authorizationValidate".`,
  },
  INVALID_OUTPUT: {
    message: `Nenhum "output" foi especificado para a ação de filtro.`,
    action: `Contate o suporte informado o campo "authorizationValidate".`,
  },
  FEATURE_NOT_AVAILABLE: {
    message: `A feature utilizada não está disponível na lista de features existentes.`,
    action: `Contate o suporte informado o campo "authorizationValidate".`,
  },
  DUPLICATE_USERNAME: {
    message: "O 'username' informado já está sendo usado.",
    action: "Por favor, escolha outro 'username' e tente novamente.",
  },
  DUPLICATE_EMAIL: {
    message: "O email informado já está sendo usado.",
    action: "Por favor, escolha outro email e tente novamente.",
  },
  NO_KEY_UPDATE_SELF_USER: {
    message: `Objeto enviado deve ter no mínimo uma chave.`,
    action: `Apenas os campos 'username', 'email' e 'password' podem ser atualizados. Verifique se o objeto enviado possui umas dessas.`,
  },
  NO_FEATURES_UPDATE_USER: {
    message: `Objeto enviado deve ter no mínimo uma chave.`,
    action: `Apenas o campo 'features' pode ser atualizado. Verifique se o objeto enviado possui a chave 'features'.`,
  },
  NO_KEY_UPDATE_OTHER_USER: {
    message: `Objeto enviado deve ter no mínimo uma chave.`,
    action: `Apenas o campo 'password' pode ser atualizado. Verifique se o objeto enviado possui a chave 'password'.`,
  },
  FIELD_REQUIRED: (field) => ({
    message: `${field} é um campo obrigatório.`,
    action: `Verifique se o campo "${field}" foi preenchido corretamente.`,
    statusCode: 400,
  }),
  FIELD_INVALID: (field) => ({
    message: `${field} possui um valor inválido.`,
    action: `Verifique o valor enviado para o campo "${field}".`,
    statusCode: 400,
  }),
  USER_NOT_FOUND_USERNAME: (username) => ({
    message: `Usuário não encontrado.`,
    action: `Verifique se o usuário "${username}" existe.`,
  }),
  NON_EDITABLE_USER: {
    message: "Este usuário não pode ser editado por outro usuário.",
    action: "Tente editar o usuário por si mesmo.",
    statusCode: 403,
  },
};

export default ERROR_MESSAGES;
