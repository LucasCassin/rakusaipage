import { createRouter } from "next-connect";
import controller from "models/controller";
import authentication from "models/authentication";
import authorization from "models/authorization";
import validator from "models/validator";
import tokenModel from "models/token";
import userModel from "models/user";
import session from "models/session";
import { ForbiddenError, UnauthorizedError } from "errors/index";

const router = createRouter().use(authentication.injectAnonymousOrUser);

router.post(
  authorization.canRequest("create:session"),
  postValidator,
  postHandler,
);

export default router.handler(controller.errorsHandlers);

function postValidator(req, res, next) {
  req.body = validator(req.body, {
    token_model: "required",
    password: "required",
  });
  next();
}

async function postHandler(req, res) {
  try {
    const { token_model: tokenString, password } = req.body;
    const currentUser = req.context.user;

    // 1. Busca e valida o token (validade, uso, expiração)
    const token = await tokenModel.findValidToken(
      tokenString,
      tokenModel.TYPES.PASSWORD_RESET,
    );

    if (!token) {
      throw new UnauthorizedError({
        message:
          "O link de recuperação é inválido ou expirou. Por favor, solicite um novo.",
      });
    }

    // 2. Verificação de segurança de Sessão (Novo Requisito)
    // Se o usuário estiver logado, ele só pode usar um token que pertença a ele mesmo.
    if (currentUser && currentUser.id && currentUser.id !== token.user_id) {
      throw new ForbiddenError({
        message:
          "Você está logado em outra conta. Faça logout para redefinir a senha deste usuário.",
      });
    }

    // 3. Atualiza a senha do usuário
    await userModel.update({
      id: token.user_id,
      password: password,
    });

    // 4. Marca o token como usado
    await tokenModel.markAsUsed(token.id);

    await session.expireAllFromUser({ id: token.user_id });

    // 5. (Opcional) Se estiver logado e for o próprio usuário,
    // poderíamos matar outras sessões, mas por hora retornamos sucesso.
    return res.status(200).json({
      message:
        "Sua senha foi alterada com sucesso! Todas suas sessões foram encerradas. Você já pode fazer login.",
    });
  } catch (error) {
    controller.errorsHandlers.onError(error, req, res);
  }
}
