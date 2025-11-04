import { createRouter } from "next-connect";
import controller from "models/controller.js";
import authentication from "models/authentication.js";
import authorization from "models/authorization.js";
import presentation from "models/presentation.js";
import presentationViewer from "models/presentation_viewer.js";
import {
  NotFoundError,
  ForbiddenError,
  UnauthorizedError,
} from "errors/index.js";

const router = createRouter()
  .use(authentication.injectAnonymousOrUser)
  .use(authentication.checkIfUserPasswordExpired);

// --- Middlewares de Auth ATUALIZADOS ---
async function patchAuthCheck(req, res, next) {
  const user = req.context.user;
  if (!user.id) {
    throw new UnauthorizedError({ message: "Usuário não autenticado." });
  }
  // Tenta a chave mestra (admin)
  if (authorization.can(user, "update:presentation:other")) {
    return next();
  }
  // Tenta a chave da casa (criador)
  if (authorization.can(user, "update:presentation:self")) {
    return next();
  }
  // Se não tem nenhuma, é 403
  throw new ForbiddenError({
    message: "Você não tem permissão para atualizar esta apresentação.",
  });
}

async function deleteAuthCheck(req, res, next) {
  const user = req.context.user;
  if (!user.id) {
    throw new UnauthorizedError({ message: "Usuário não autenticado." });
  }
  if (authorization.can(user, "delete:presentation:other")) {
    return next();
  }
  if (authorization.can(user, "delete:presentation:self")) {
    return next();
  }
  throw new ForbiddenError({
    message: "Você não tem permissão para deletar esta apresentação.",
  });
}
// --- FIM DA ATUALIZAÇÃO ---

// --- Rotas ---
router.get(getHandler);
router.patch(patchAuthCheck, patchHandler);
router.delete(deleteAuthCheck, deleteHandler);

export default router.handler(controller.errorsHandlers);

// --- getHandler (Permanece o mesmo) ---
async function getHandler(req, res) {
  try {
    const user = req.context.user;
    const { id: presentation_id } = req.query;

    const presentationData = await presentation.findDeepById(presentation_id);
    if (!presentationData) {
      throw new NotFoundError({ message: "Apresentação não encontrada." });
    }

    // --- Lógica de Permissão (self-service) ---
    const isPublic = presentationData.is_public;
    const isCreator =
      user.id && presentationData.created_by_user_id === user.id;
    const isGlobalAdmin = authorization.can(user, "read:presentation:other");

    let isViewer = false;
    if (user.id && !isCreator && !isGlobalAdmin) {
      const viewerList =
        await presentationViewer.findByPresentationId(presentation_id);
      isViewer = viewerList.some((viewer) => viewer.id === user.id);
    }

    if (!isPublic && !isCreator && !isViewer && !isGlobalAdmin) {
      if (!user.id) {
        throw new UnauthorizedError({
          message: "Você precisa estar logado para ver esta apresentação.",
        });
      }
      throw new ForbiddenError({
        message: "Você não tem permissão para ver esta apresentação.",
      });
    }
    // --- Fim da Lógica ---

    const feature =
      isCreator || isGlobalAdmin
        ? "read:presentation:other"
        : "read:presentation:self";
    const filteredOutput = authorization.filterOutput(
      user,
      feature,
      presentationData,
    );

    filteredOutput.scenes = presentationData.scenes;

    res.status(200).json(filteredOutput);
  } catch (error) {
    controller.errorsHandlers.onError(error, req, res);
  }
}

async function patchHandler(req, res) {
  try {
    const user = req.context.user;
    const { id: presentation_id } = req.query;

    // 1. Busca o recurso primeiro, para o 'can()' funcionar
    const presToUpdate = await presentation.findById(presentation_id);
    if (!presToUpdate) {
      throw new NotFoundError({ message: "Apresentação não encontrada." });
    }

    // 2. A Rota checa a permissão (o modelo não precisa mais checar)
    if (
      !authorization.can(user, "update:presentation:other", presToUpdate) &&
      !authorization.can(user, "update:presentation:self", presToUpdate)
    ) {
      throw new ForbiddenError({
        message: "Você não tem permissão para editar esta apresentação.",
      });
    }

    // 3. O modelo agora só atualiza, sem checar permissão
    const updatedPres = await presentation.update(
      presentation_id,
      req.body,
      user.id,
    );

    // 4. CORREÇÃO: Determina qual feature usar para filtrar a saída
    const feature = authorization.can(user, "update:presentation:other")
      ? "update:presentation:other"
      : "update:presentation:self";

    const filteredOutput = authorization.filterOutput(
      user,
      feature,
      updatedPres,
    );
    res.status(200).json(filteredOutput);
  } catch (error) {
    controller.errorsHandlers.onError(error, req, res);
  }
}

// --- deleteHandler (CORRIGIDO) ---
async function deleteHandler(req, res) {
  try {
    const user = req.context.user;
    const { id: presentation_id } = req.query;

    const presToDelete = await presentation.findById(presentation_id);
    if (!presToDelete) {
      throw new NotFoundError({ message: "Apresentação não encontrada." });
    }

    if (
      !authorization.can(user, "delete:presentation:other", presToDelete) &&
      !authorization.can(user, "delete:presentation:self", presToDelete)
    ) {
      throw new ForbiddenError({
        message: "Você não tem permissão para deletar esta apresentação.",
      });
    }

    const deletedPres = await presentation.del(presentation_id, user.id);

    const feature = authorization.can(user, "delete:presentation:other")
      ? "delete:presentation:other"
      : "delete:presentation:self";

    const filteredOutput = authorization.filterOutput(
      user,
      feature,
      deletedPres,
    );
    res.status(200).json(filteredOutput);
  } catch (error) {
    controller.errorsHandlers.onError(error, req, res);
  }
}
