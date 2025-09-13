import { createRouter } from "next-connect";
import controller from "models/controller.js";
import authentication from "models/authentication.js";
import authorization from "models/authorization.js";
import validator from "models/validator.js";
import comment from "models/comment.js";
import { ForbiddenError } from "errors/index.js";
import ERROR_MESSAGES from "models/error-messages.js";

const router = createRouter()
  .use(authentication.injectAnonymousOrUser)
  .use(authentication.checkIfUserPasswordExpired);

// Rota para LER os comentários de um vídeo
router.get(authorization.canRequest("read:comment"), getValidator, getHandler);

// Rota para CRIAR um novo comentário
router.post(
  authorization.canRequest("create:comment"),
  postValidator,
  postHandler,
);

// Rota para ATUALIZAR um comentário (com verificação de múltiplas features)
router.patch(patchValidator, patchCanRequestHandler, patchHandler);

// Rota para APAGAR um comentário (com verificação de múltiplas features)
router.delete(deleteValidator, deleteCanRequestHandler, deleteHandler);

export default router.handler(controller.errorsHandlers);

// --- GET (Ler comentários) ---
function getValidator(req, res, next) {
  req.query = validator(req.query, { video_id: "required" });
  next();
}

async function getHandler(req, res) {
  const comments = await comment.findByVideoId(
    req.query.video_id,
    req.context.user,
  );
  const filteredOutput = comments.map((c) =>
    authorization.filterOutput(req.context.user, "read:comment", c),
  );
  res.status(200).json(filteredOutput);
}

// --- POST (Criar comentário) ---
function postValidator(req, res, next) {
  req.body = validator(req.body, {
    content: "required",
    video_id: "required",
    parent_id: "optional",
    return_list: "optional",
  });
  next();
}

async function postHandler(req, res) {
  const newComment = await comment.create(req.body, req.context.user);
  let filteredOutput = null;

  if (req.body.return_list) {
    filteredOutput = newComment.map((c) =>
      authorization.filterOutput(req.context.user, "read:comment", c),
    );
  } else {
    filteredOutput = authorization.filterOutput(
      req.context.user,
      "read:comment",
      newComment,
    );
  }

  res.status(201).json(filteredOutput);
}

// --- PATCH (Atualizar comentário) ---
async function patchCanRequestHandler(req, res, next) {
  try {
    const requestingUser = req.context.user;
    const targetComment = await comment.findOne(
      req.body.comment_id,
      requestingUser,
    );

    const isOwner = requestingUser.id === targetComment.user_id;

    const canUpdate =
      (isOwner &&
        authorization.can(
          requestingUser,
          "update:self:comment",
          targetComment,
        )) ||
      (!isOwner && authorization.can(requestingUser, "update:other:comment"));

    if (!canUpdate) {
      throw new ForbiddenError(ERROR_MESSAGES.FORBIDDEN_COMMENT_UPDATE);
    }

    req.context.targetComment = targetComment;

    next();
  } catch (error) {
    controller.errorsHandlers.onError(error, req, res);
  }
}

function patchValidator(req, res, next) {
  req.body = validator(req.body, {
    comment_id: "required",
    content: "required",
    return_list: "optional",
  });
  next();
}

async function patchHandler(req, res) {
  try {
    const result = await comment.update(req.body, req.context.user);
    let filteredOutput;

    if (req.body.return_list) {
      filteredOutput = result.map((c) =>
        authorization.filterOutput(req.context.user, "read:comment", c),
      );
    } else {
      filteredOutput = authorization.filterOutput(
        req.context.user,
        "read:comment",
        result,
      );
    }

    res.status(200).json(filteredOutput);
  } catch (error) {
    controller.errorsHandlers.onError(error, req, res);
  }
}

// --- DELETE (Apagar comentário) ---
async function deleteCanRequestHandler(req, res, next) {
  try {
    const requestingUser = req.context.user;
    const targetComment = await comment.findOne(
      req.body.comment_id,
      requestingUser,
    );

    const isOwner = requestingUser.id === targetComment.user_id;

    const canDelete =
      (isOwner &&
        authorization.can(
          requestingUser,
          "delete:self:comment",
          targetComment,
        )) ||
      (!isOwner && authorization.can(requestingUser, "delete:other:comment"));

    if (!canDelete) {
      throw new ForbiddenError(ERROR_MESSAGES.FORBIDDEN_COMMENT_DELETE);
    }

    req.context.permissionFeature = isOwner
      ? "delete:self:comment"
      : "delete:other:comment";

    next();
  } catch (error) {
    controller.errorsHandlers.onError(error, req, res);
  }
}

function deleteValidator(req, res, next) {
  req.body = validator(req.body, { comment_id: "required" });
  next();
}

async function deleteHandler(req, res) {
  try {
    const deletedComment = await comment.del(req.body.comment_id);

    // MUDANÇA: Lógica de filtro simplificada
    const feature = req.context.permissionFeature;
    const filteredOutput = authorization.filterOutput(
      req.context.user,
      feature,
      deletedComment,
    );

    res.status(200).json(filteredOutput);
  } catch (error) {
    controller.errorsHandlers.onError(error, req, res);
  }
}
