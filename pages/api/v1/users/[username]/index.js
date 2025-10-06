import { createRouter } from "next-connect";
import controller from "models/controller.js";
import authentication from "models/authentication";
import user from "models/user.js";
import authorization from "models/authorization";
import validator from "models/validator.js";
import ERROR_MESSAGES from "models/error-messages.js";
import {
  ForbiddenError,
  NotFoundError,
  ValidationError,
  NonEditableUserError,
} from "errors/index.js";

const router = createRouter().use(authentication.injectAnonymousOrUser);

router.get(
  authentication.checkIfUserPasswordExpired,
  getCanRequestHandler,
  getValidator,
  getHandler,
);
router.patch(patchCanRequestHandler, patchValidator, patchHandler);

export default router.handler(controller.errorsHandlers);

function getCanRequestHandler(req, res, next) {
  const requestingUser = req.context.user;

  if (
    authorization.can(requestingUser, "read:user:self", requestingUser) ||
    authorization.can(requestingUser, "read:user:other")
  ) {
    return next();
  }

  throw new ForbiddenError(ERROR_MESSAGES.FORBIDDEN_READ_USER);
}

function getValidator(req, res, next) {
  req.query = validator(req.query, {
    username: "required",
  });

  return next();
}

async function getHandler(req, res) {
  const requestingUser = req.context.user;
  const rawQueryData = req.query;

  const validatedQueryData = authorization.filterInput(
    requestingUser,
    requestingUser.features.includes("read:user:other")
      ? "read:user:other"
      : "read:user:self",
    rawQueryData,
    requestingUser.features.includes("read:user:other") ? null : requestingUser,
  );

  const foundUser = await user.findOneUser(validatedQueryData);
  if (!foundUser) {
    throw new NotFoundError(
      ERROR_MESSAGES.USER_NOT_FOUND_USERNAME(validatedQueryData.username),
    );
  }

  if (
    foundUser.username === requestingUser.username &&
    authorization.can(requestingUser, "read:user:self", foundUser)
  ) {
    const filteredOutputData = authorization.filterOutput(
      requestingUser,
      "read:user:self",
      foundUser,
    );

    return res.status(200).json(filteredOutputData);
  }

  if (
    foundUser.username !== requestingUser.username &&
    authorization.can(requestingUser, "read:user:other")
  ) {
    const filteredOutputData = authorization.filterOutput(
      requestingUser,
      "read:user:other",
      foundUser,
    );

    return res.status(200).json(filteredOutputData);
  }

  throw new ForbiddenError(ERROR_MESSAGES.FORBIDDEN_READ_USER);
}

function patchCanRequestHandler(req, res, next) {
  const requestingUser = req.context.user;

  if (
    authorization.can(requestingUser, "update:user:self", requestingUser) ||
    authorization.can(
      requestingUser,
      "update:user:password:self",
      requestingUser,
    ) ||
    authorization.can(requestingUser, "update:user:other") ||
    authorization.can(
      requestingUser,
      "update:user:features:self",
      requestingUser,
    ) ||
    authorization.can(requestingUser, "update:user:features:other")
  ) {
    return next();
  }

  throw new ForbiddenError(ERROR_MESSAGES.FORBIDDEN_UPDATE_USER);
}

function patchValidator(req, res, next) {
  req.query = validator(req.query, {
    username: "required",
  });

  req.body = validator(req.body, {
    email: "optional",
    password: "optional",
    username: "optional",
    features: "optional",
  });

  return next();
}

async function patchHandler(req, res) {
  const requestingUser = req.context.user;
  const targetUsername = req.query.username;
  const rawBodyData = req.body;

  const targetUser = await user.findOneUser({ username: targetUsername });
  if (!targetUser) {
    throw new NotFoundError(
      ERROR_MESSAGES.USER_NOT_FOUND_USERNAME(targetUsername),
    );
  }

  // Determine which update operation to perform
  const isSelf = targetUser.username === requestingUser.username;

  if (isSelf) {
    let outputFeatures = null;
    let outputSelf = null;
    let outputPassword = null;
    if (
      rawBodyData.features &&
      authorization.can(requestingUser, "update:user:features:self", targetUser)
    ) {
      outputFeatures = await handleSelfFeaturesUpdate(
        req,
        res,
        requestingUser,
        targetUser,
        rawBodyData,
      );
    }
    if (
      authorization.can(requestingUser, "update:user:self", targetUser) &&
      Object.keys(rawBodyData).some(
        (key) => key !== "features" && key !== "password",
      )
    ) {
      outputSelf = await handleSelfUpdate(
        req,
        res,
        requestingUser,
        targetUser,
        rawBodyData,
      );
    }
    if (
      authorization.can(
        requestingUser,
        "update:user:password:self",
        targetUser,
      ) &&
      Object.keys(rawBodyData).some((key) => key === "password")
    ) {
      outputPassword = await handleSelfPasswordUpdate(
        req,
        res,
        requestingUser,
        targetUser,
        rawBodyData,
      );
    }
    if (outputFeatures || outputSelf || outputPassword) {
      return res
        .status(200)
        .json({ ...outputFeatures, ...outputSelf, ...outputPassword });
    } else {
      throw new ForbiddenError(ERROR_MESSAGES.FORBIDDEN_UPDATE_USER);
    }
  } else {
    let outputFeatures = null;
    let outputSelf = null;
    if (
      rawBodyData.features &&
      authorization.can(requestingUser, "update:user:features:other")
    ) {
      if (authorization.can(targetUser, "block:other:update:self")) {
        throw new NonEditableUserError(ERROR_MESSAGES.NON_EDITABLE_USER);
      }
      outputFeatures = await handleOtherFeaturesUpdate(
        req,
        res,
        requestingUser,
        targetUser,
        rawBodyData,
      );
    }
    if (
      authorization.can(requestingUser, "update:user:other") &&
      Object.keys(rawBodyData).some((key) => key !== "features")
    ) {
      if (authorization.can(targetUser, "block:other:update:self")) {
        throw new NonEditableUserError(ERROR_MESSAGES.NON_EDITABLE_USER);
      }
      outputSelf = await handleOtherUserUpdate(
        req,
        res,
        requestingUser,
        targetUser,
        rawBodyData,
      );
    }
    if (outputFeatures || outputSelf) {
      return res.status(200).json({ ...outputFeatures, ...outputSelf });
    } else {
      throw new ForbiddenError(ERROR_MESSAGES.FORBIDDEN_UPDATE_USER);
    }
  }
}

// Handlers for each specific case
async function handleSelfUpdate(
  req,
  res,
  requestingUser,
  targetUser,
  rawBodyData,
) {
  const validatedBodyData = authorization.filterInput(
    requestingUser,
    "update:user:self",
    rawBodyData,
    targetUser,
  );

  if (Object.keys(validatedBodyData).length === 0) {
    throw new ValidationError(ERROR_MESSAGES.NO_KEY_UPDATE_SELF_USER);
  }

  if (!validatedBodyData.password) {
    authentication.checkIfUserPasswordExpired(req, res, () => {});
  }

  const updatedUser = await user.update({
    id: targetUser.id,
    ...validatedBodyData,
  });

  const filteredOutputData = authorization.filterOutput(
    requestingUser,
    "update:user:self",
    updatedUser,
  );

  return filteredOutputData;
}

async function handleSelfPasswordUpdate(
  req,
  res,
  requestingUser,
  targetUser,
  rawBodyData,
) {
  const validatedBodyData = authorization.filterInput(
    requestingUser,
    "update:user:password:self",
    rawBodyData,
    targetUser,
  );

  if (Object.keys(validatedBodyData).length === 0) {
    throw new ValidationError(ERROR_MESSAGES.NO_KEY_UPDATE_PASSWORD_SELF_USER);
  }

  if (!validatedBodyData.password) {
    authentication.checkIfUserPasswordExpired(req, res, () => {});
  }

  const updatedUser = await user.update({
    id: targetUser.id,
    ...validatedBodyData,
  });

  const filteredOutputData = authorization.filterOutput(
    requestingUser,
    "update:user:password:self",
    updatedUser,
  );

  return filteredOutputData;
}

async function handleOtherUserUpdate(
  req,
  res,
  requestingUser,
  targetUser,
  rawBodyData,
) {
  const validatedBodyData = authorization.filterInput(
    requestingUser,
    "update:user:other",
    rawBodyData,
  );

  if (Object.keys(validatedBodyData).length === 0) {
    throw new ValidationError(ERROR_MESSAGES.NO_KEY_UPDATE_OTHER_USER);
  }

  authentication.checkIfUserPasswordExpired(req, res, () => {});

  const updatedUser = await user.expireUserPassword(
    await user.update({
      id: targetUser.id,
      ...validatedBodyData,
    }),
  );

  const filteredOutputData = authorization.filterOutput(
    requestingUser,
    "update:user:other",
    updatedUser,
  );

  return filteredOutputData;
}

async function handleSelfFeaturesUpdate(
  req,
  res,
  requestingUser,
  targetUser,
  rawBodyData,
) {
  const validatedBodyData = authorization.filterInput(
    requestingUser,
    "update:user:features:self",
    rawBodyData,
    targetUser,
  );

  if (Object.keys(validatedBodyData).length === 0) {
    throw new ValidationError(ERROR_MESSAGES.NO_FEATURES_UPDATE_USER);
  }

  authentication.checkIfUserPasswordExpired(req, res, () => {});

  const updatedUser = await user.updateFeatures(
    { id: targetUser.id },
    validatedBodyData.features,
  );

  const filteredOutputData = authorization.filterOutput(
    requestingUser,
    "update:user:features:self",
    updatedUser,
  );
  return filteredOutputData;
}

async function handleOtherFeaturesUpdate(
  req,
  res,
  requestingUser,
  targetUser,
  rawBodyData,
) {
  const validatedBodyData = authorization.filterInput(
    requestingUser,
    "update:user:features:other",
    rawBodyData,
  );

  if (Object.keys(validatedBodyData).length === 0) {
    throw new ValidationError(ERROR_MESSAGES.NO_FEATURES_UPDATE_USER);
  }

  authentication.checkIfUserPasswordExpired(req, res, () => {});

  const updatedUser = await user.updateFeatures(
    { id: targetUser.id },
    validatedBodyData.features,
  );

  const filteredOutputData = authorization.filterOutput(
    requestingUser,
    "update:user:features:other",
    updatedUser,
  );

  return filteredOutputData;
}
