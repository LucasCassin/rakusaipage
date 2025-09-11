import { createRouter } from "next-connect";
import controller from "models/controller.js";
import authentication from "models/authentication.js";
import authorization from "models/authorization.js";
import validator from "models/validator.js";
import commentLike from "models/comment-like.js";

const router = createRouter()
  .use(authentication.injectAnonymousOrUser)
  .use(authentication.checkIfUserPasswordExpired);

// Rota para CURTIR um comentário
router.put(authorization.canRequest("like:comment"), putValidator, putHandler);

// Rota para DESCURTIR um comentário
router.delete(
  authorization.canRequest("unlike:comment"),
  deleteValidator,
  deleteHandler,
);

export default router.handler(controller.errorsHandlers);

// --- PUT (Curtir) ---
function putValidator(req, res, next) {
  req.query = validator(req.query, { comment_id: "required" });
  next();
}

async function putHandler(req, res) {
  try {
    const likeData = { comment_id: req.query.comment_id };
    const result = await commentLike.like(likeData, req.context.user);
    const filteredOutput = authorization.filterOutput(
      req.context.user,
      "like:comment",
      result,
    );
    res.status(200).json(filteredOutput); // 200 OK é apropriado pois a ação é idempotente
  } catch (error) {
    controller.errorsHandlers.onError(error, req, res);
  }
}

// --- DELETE (Descurtir) ---
function deleteValidator(req, res, next) {
  req.query = validator(req.query, { comment_id: "required" });
  next();
}

async function deleteHandler(req, res) {
  try {
    const likeData = { comment_id: req.query.comment_id };
    const result = await commentLike.unlike(likeData, req.context.user);
    const filteredOutput = authorization.filterOutput(
      req.context.user,
      "unlike:comment",
      result,
    );
    res.status(200).json(filteredOutput);
  } catch (error) {
    controller.errorsHandlers.onError(error, req, res);
  }
}
