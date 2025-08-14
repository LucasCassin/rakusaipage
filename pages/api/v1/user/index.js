import { createRouter } from "next-connect";
import controller from "models/controller.js";
import authentication from "models/authentication.js";
import authorization from "models/authorization.js";
import session from "models/session.js";
import { ForbiddenError } from "errors/index.js";

const router = createRouter().use(authentication.injectAnonymousOrUser);

router.get(
  authorization.canRequest("read:session:self"),
  renewSessionIfNecessary,
  getHandler,
);

// Cria um handler de erro personalizado que limpa o cookie e depois usa o handler padrão
const customErrorHandler = (err, req, res) => {
  if (err instanceof ForbiddenError) {
    session.clearSessionIdCookie(res);
  }
  return controller.errorsHandlers.onError(err, req, res);
};

export default router.handler({
  onError: customErrorHandler,
  onNoMatch: controller.errorsHandlers.onNoMatch,
});

async function getHandler(request, response) {
  const authenticatedUser = request.context.user;

  const secureOutputValues = authorization.filterOutput(
    authenticatedUser,
    "read:user:self",
    authenticatedUser,
  );

  return response.status(200).json(secureOutputValues);
}

async function renewSessionIfNecessary(request, response, next) {
  let sessionObject = request.context.session;

  // Renew session if it expires in less than 1 weeks.
  if (
    new Date(sessionObject.expires_at) <
    Date.now() + 1000 * 60 * 60 * 24 * 7 * 1
  ) {
    sessionObject = await session.renew(sessionObject, response);

    request.context.session = sessionObject;
  }
  return next();
}
