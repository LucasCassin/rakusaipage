class BaseError extends Error {
  constructor({ message, action, statusCode, cause, errorName } = {}) {
    super(message || "Erro desconhecido");
    this.action = action || "Contate o administrador do sistema";
    this.name = errorName || this.constructor.name;
    this.statusCode = statusCode || 500;
    if (cause) {
      this.cause = cause;
    }
  }

  toJSON() {
    return {
      name: this.name,
      message: this.message,
      action: this.action,
      status_code: this.statusCode,
    };
  }
}

export class InternalServerError extends BaseError {
  constructor({ message, action, cause } = {}) {
    super({
      message: message || "Um erro interno ocorreu no servidor.",
      action: action || "Contate o administrador do sistema.",
      statusCode: 500,
      cause,
      errorName: "InternalServerError",
    });
  }
}

export class ServiceError extends BaseError {
  constructor({ message, action, cause } = {}) {
    super({
      message: message || "Serviço indisponível no momento.",
      action: action || "Verifique se o serviço está disponível.",
      statusCode: 503,
      cause,
      errorName: "ServiceError",
    });
  }
}

export class ValidationError extends BaseError {
  constructor({ message, action, cause } = {}) {
    super({
      message: message || "Erro de validação nos dados fornecidos.",
      action: action || "Ajuste os dados enviados e tente novamente.",
      statusCode: 400,
      cause,
      errorName: "ValidationError",
    });
  }
}

export class ValidationSessionError extends BaseError {
  constructor({ message, action, cause } = {}) {
    super({
      message: message || "Erro de validação da sessão.",
      action: action || "Ajuste os dados enviados e tente novamente.",
      statusCode: 400,
      cause,
      errorName: "ValidationSessionError",
    });
  }
}

export class UnprocessableEntityError extends BaseError {
  constructor({ message, action, cause } = {}) {
    super({
      message: message || "Erro no envio dos dados.",
      action: action || "Verifique os dados enviados e tente novamente.",
      statusCode: 422,
      cause,
      errorName: "UnprocessableEntityError",
    });
  }
}

export class NotFoundError extends BaseError {
  constructor({ message, action, cause } = {}) {
    super({
      message: message || "Recurso não encontrado no sistema.",
      action: action || "Verifique se o caminho (PATH) está correto.",
      statusCode: 404,
      cause,
      errorName: "NotFoundError",
    });
  }
}

export class UnauthorizedError extends BaseError {
  constructor({ message, action, cause } = {}) {
    super({
      message: message || "Usuário não autenticado.",
      action:
        action ||
        "Verifique se você está autenticado com uma sessão ativa e tente novamente.",
      statusCode: 401,
      cause,
      errorName: "UnauthorizedError",
    });
  }
}

export class ForbiddenError extends BaseError {
  constructor({ message, action, cause } = {}) {
    super({
      message: message || "Você não possui permissão para executar esta ação.",
      action:
        action || "Verifique se você possui permissão para executar esta ação.",
      statusCode: 403,
      cause,
      errorName: "ForbiddenError",
    });
  }
}

export class PasswordExpiredError extends BaseError {
  constructor({ message, action, cause } = {}) {
    super({
      message: message || "A sua senha expirou.",
      action: action || "Atualize sua senha para continuar com o acesso.",
      statusCode: 403,
      cause,
      errorName: "PasswordExpiredError",
    });
  }
}

export class NonEditableUserError extends BaseError {
  constructor({ message, action, cause } = {}) {
    super({
      message:
        message || "Este usuário não pode ser editado por outro usuário.",
      action: action || "Tente editar o usuário por si mesmo.",
      statusCode: 403,
      cause,
      errorName: "NonEditableUserError",
    });
  }
}

export class MethodNotAllowedError extends BaseError {
  constructor({ message, action, cause } = {}) {
    super({
      message: message || "Método não permitido para esta rota.",
      action:
        action || "Verifique se o método HTTP está correto para esta rota.",
      statusCode: 405,
      cause,
      errorName: "MethodNotAllowedError",
    });
  }
}
