import { createRouter } from "next-connect";
import controller from "models/controller.js";
import authentication from "models/authentication";
import user from "models/user.js";
import authorization from "models/authorization";
import validator from "models/validator.js";
import ERROR_MESSAGES from "models/error-messages.js";
import {
  ForbiddenError,
  UnauthorizedError,
  PasswordExpiredError,
} from "errors/index.js";
import session from "models/session";

const router = createRouter().use(authentication.injectAnonymousOrUser);
router.post(
  authorization.canRequest("create:session"),
  postValidator,
  postHandler,
);
router.delete(authorization.canRequest("read:session:self"), deleteHandler);

export default router.handler(controller.errorsHandlers);

/**
 * Validates the request body for creating a session.
 */
function postValidator(req, res, next) {
  req.body = validator(req.body, {
    email: "required",
    password: "required",
  });

  return next();
}

/**
 * Handles the creation of a new session.
 */
async function postHandler(req, res) {
  const userTryingToCreateSession = req.context.user;
  const insecureInputValues = req.body;

  const secureInputValues = authorization.filterInput(
    userTryingToCreateSession,
    "create:session",
    insecureInputValues,
  );

  // Compress all mismatch errors (email and password) into one single error.
  let storedUser;
  try {
    storedUser = await user.findOneUser(secureInputValues);
    await authentication.comparePassword(
      secureInputValues.password,
      storedUser.password,
    );
  } catch (error) {
    throw new UnauthorizedError({
      ...ERROR_MESSAGES.DATA_MISMATCH,
      cause: error,
    });
  }

  if (!authorization.can(storedUser, "create:session")) {
    throw new ForbiddenError(ERROR_MESSAGES.FORBIDDEN_CREATE_SESSION);
  }

  await session.expireAllFromUser(storedUser);

  const sessionObject = await authentication.createSessionAndSetCookies(
    storedUser,
    res,
  );

  if (Date.parse(storedUser.password_expires_at) < Date.now()) {
    throw new PasswordExpiredError();
  }

  const secureOutputValues = authorization.filterOutput(
    storedUser,
    "create:session",
    sessionObject,
  );

  return res.status(201).json(secureOutputValues);
}

/**
 * Handles the deletion of a session.
 */
async function deleteHandler(req, res) {
  const authenticatedUser = req.context.user;
  const sessionObject = req.context.session;

  const expiredSession = await session.expire(sessionObject);
  session.clearSessionIdCookie(res);

  const secureOutputValues = authorization.filterOutput(
    authenticatedUser,
    "read:session:self",
    expiredSession,
  );

  return res.status(200).json(secureOutputValues);
}
