import { createRouter } from "next-connect";
import controller from "models/controller.js";
import authentication from "models/authentication";
import user from "models/user.js";
import authorization from "models/authorization";
import validator from "models/validator.js";

const router = createRouter().use(authentication.injectAnonymousOrUser);
router.post(
  authorization.canRequest("create:user"),
  postValidator,
  postHandler,
);

export default router.handler(controller.errorsHandlers);

/**
 * Validates the request body for creating a user.
 */
function postValidator(req, res, next) {
  req.body = validator(req.body, {
    username: "required",
    email: "required",
    password: "required",
  });

  return next();
}

/**
 * Handles the creation of a new user.
 */
async function postHandler(req, res) {
  const requestingUser = req.context.user;
  const rawInputData = req.body;
  const validatedInputData = authorization.filterInput(
    requestingUser,
    "create:user",
    rawInputData,
  );

  const newUser = await user.create(validatedInputData);
  const filteredOutputData = authorization.filterOutput(
    newUser,
    "read:user:self",
    newUser,
  );
  res.status(201).json(filteredOutputData);
}
