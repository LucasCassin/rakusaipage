import { createRouter } from "next-connect";
import controller from "models/controller";
import authentication from "models/authentication";
import authorization from "models/authorization";
import validator from "models/validator";
import userModel from "models/user";
import tokenModel from "models/token";
import { emailService } from "services/emailService";

const router = createRouter().use(authentication.injectAnonymousOrUser);

router.post(
  authorization.canRequest("create:session"),
  postValidator,
  postHandler,
);

export default router.handler(controller.errorsHandlers);

function postValidator(req, res, next) {
  req.body = validator(req.body, {
    email: "required",
  });
  next();
}

async function postHandler(req, res) {
  try {
    const { email } = req.body;

    // Busca usuário (Silent fail se não encontrar para evitar User Enumeration)
    const user = await userModel.findOneUser({ email });

    if (user) {
      // Verifica Rate Limit (1 a cada 5 min)
      const hasRecent = await tokenModel.hasRecentRequest(
        user.id,
        tokenModel.TYPES.PASSWORD_RESET,
        5, // minutos
      );

      if (!hasRecent) {
        const token = await tokenModel.create({
          userId: user.id,
          type: tokenModel.TYPES.PASSWORD_RESET,
        });

        const baseUrl =
          process.env.NEXT_PUBLIC_WEB_URL || `http://${req.headers.host}`;
        const resetLink = `${baseUrl}/profile/password/reset?token=${token.token}`;

        await emailService.sendPasswordResetEmail(user.email, resetLink);
      }
    }

    // Retorna 200 sempre
    return res.status(200).json({
      message:
        "Se o e-mail estiver cadastrado, você receberá um link de recuperação em instantes.",
    });
  } catch (error) {
    controller.errorsHandlers.onError(error, req, res);
  }
}
