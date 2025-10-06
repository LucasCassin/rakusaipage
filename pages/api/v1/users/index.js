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

router.get(
  authentication.checkIfUserPasswordExpired,
  authorization.canRequest("read:user:other"),
  getValidator,
  getHandler,
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

/**
 * Validates the request query for finding users by feature.
 */
function getValidator(req, res, next) {
  let features = req.query.features || null;

  if (features === null) {
    validator({}, { features: "required" });
  }

  let featuresArray = [];

  if (features) {
    if (Array.isArray(features)) {
      featuresArray = features;
    } else {
      featuresArray = [features];
    }
  }

  req.query = validator(
    { features: featuresArray },
    {
      features: "required",
    },
  );
  return next();
}

/**
 * Handles fetching users by a specific feature.
 */
async function getHandler(req, res) {
  const requestingUser = req.context.user;
  const { features } = req.query;

  const foundUsers = await user.findUsersByFeatures(features);

  // Filtra os dados de cada usuário para o output
  const filteredUsers = foundUsers.map((foundUser) => {
    return authorization.filterOutput(
      requestingUser,
      "read:user:other",
      foundUser,
    );
  });

  res.status(200).json(filteredUsers);
}
