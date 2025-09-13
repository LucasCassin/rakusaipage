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
  });
  next();
}

async function postHandler(req, res) {
  const newComment = await comment.create(req.body, req.context.user);

  const filteredOutput = authorization.filterOutput(
    req.context.user,
    "create:comment",
    newComment,
  );
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

    const canUpdateSelf =
      requestingUser.id === targetComment.user_id &&
      authorization.can(requestingUser, "update:self:comment", targetComment);
    const canUpdateOther =
      requestingUser.id !== targetComment.user_id &&
      authorization.can(requestingUser, "update:other:comment");

    req.body.canUpdateSelf = canUpdateSelf;
    req.body.canUpdateOther = canUpdateOther;

    if (canUpdateSelf || canUpdateOther) {
      return next();
    }
    throw new ForbiddenError(ERROR_MESSAGES.FORBIDDEN_COMMENT_UPDATE);
  } catch (error) {
    controller.errorsHandlers.onError(error, req, res);
  }
}

function patchValidator(req, res, next) {
  req.body = validator(req.body, {
    comment_id: "required",
    content: "required",
  });
  next();
}

async function patchHandler(req, res) {
  try {
    const updatedComment = await comment.update(req.body, req.context.user);
    let filteredOutput = null;

    if (req.body.canUpdateSelf) {
      filteredOutput = authorization.filterOutput(
        req.context.user,
        "update:self:comment",
        updatedComment,
      );
    } else if (req.body.canUpdateOther) {
      filteredOutput = authorization.filterOutput(
        req.context.user,
        "update:other:comment",
        updatedComment,
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

    const canDeleteSelf =
      requestingUser.id === targetComment.user_id &&
      authorization.can(requestingUser, "delete:self:comment", targetComment);

    const canDeleteOther =
      requestingUser.id !== targetComment.user_id &&
      authorization.can(requestingUser, "delete:other:comment");

    req.body.canDeleteSelf = canDeleteSelf;
    req.body.canDeleteOther = canDeleteOther;

    if (canDeleteSelf || canDeleteOther) {
      return next();
    }
    throw new ForbiddenError(ERROR_MESSAGES.FORBIDDEN_COMMENT_DELETE);
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
    let filteredOutput = null;
    if (req.body.canDeleteSelf) {
      filteredOutput = authorization.filterOutput(
        req.context.user,
        "delete:self:comment",
        deletedComment,
      );
    } else if (req.body.canDeleteOther) {
      filteredOutput = authorization.filterOutput(
        req.context.user,
        "delete:other:comment",
        deletedComment,
      );
    }
    res.status(200).json(filteredOutput);
  } catch (error) {
    controller.errorsHandlers.onError(error, req, res);
  }
}
