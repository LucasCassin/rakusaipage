import { createRouter } from "next-connect";
import controller from "models/controller.js";
import authentication from "models/authentication.js";
import authorization from "models/authorization.js";
import presentation from "models/presentation.js";
import presentationViewer from "models/presentation_viewer.js";
import { NotFoundError, ForbiddenError } from "errors/index.js";

const router = createRouter()
  .use(authentication.injectAnonymousOrUser)
  .use(authentication.checkIfUserPasswordExpired);

// --- Rota GET (Busca Profunda) ---
router.get(getHandler);

// --- Rota PATCH (Atualizar) ---
router.patch(authorization.canRequest("update:presentation"), patchHandler);

// --- Rota DELETE (Deletar) ---
router.delete(authorization.canRequest("delete:presentation"), deleteHandler);

export default router.handler(controller.errorsHandlers);

/**
 * Handler para GET /api/v1/presentations/[id]
 * Busca todos os detalhes de uma apresentação.
 * Regra de Permissão: (É pública) OU (É o criador) OU (Está no elenco) OU (É admin global)
 */
async function getHandler(req, res) {
  try {
    const user = req.context.user;
    const { id: presentation_id } = req.query;

    const presentationData = await presentation.findDeepById(presentation_id);
    if (!presentationData) {
      throw new NotFoundError({ message: "Apresentação não encontrada." });
    }

    // --- Lógica de Permissão ---
    const isPublic = presentationData.is_public;
    const isCreator = presentationData.created_by_user_id === user.id;
    const isGlobalAdmin = authorization.can(user, "read:presentation:other");

    // Verifica se está no elenco (só checa se não for admin ou criador)
    let isViewer = false;
    if (user.id && !isCreator && !isGlobalAdmin) {
      const viewerList =
        await presentationViewer.findByPresentationId(presentation_id);
      isViewer = viewerList.some((viewer) => viewer.id === user.id);
    }

    if (!isPublic && !isCreator && !isViewer && !isGlobalAdmin) {
      throw new ForbiddenError({
        message: "Você não tem permissão para ver esta apresentação.",
      });
    }
    // --- Fim da Lógica ---

    // O usuário pode ver. Filtra a saída.
    // (Usamos 'read:presentation:other' se for admin/criador, 'self' se for viewer)
    const feature =
      isCreator || isGlobalAdmin
        ? "read:presentation:other"
        : "read:presentation:self";

    // (Nota: A filtragem do authorization.js só se aplica ao objeto
    // 'presentationData' principal. As 'scenes' e 'elements' aninhadas
    // serão enviadas, pois 'read:presentation:self' não as lista.)
    const filteredOutput = authorization.filterOutput(
      user,
      feature,
      presentationData,
    );

    // Re-adicionamos os dados aninhados que o filtro pode ter removido
    filteredOutput.scenes = presentationData.scenes;

    res.status(200).json(filteredOutput);
  } catch (error) {
    controller.errorsHandlers.onError(error, req, res);
  }
}

/**
 * Handler para PATCH /api/v1/presentations/[id]
 * Atualiza os detalhes de uma apresentação.
 */
async function patchHandler(req, res) {
  try {
    const user = req.context.user;
    const { id: presentation_id } = req.query;

    // O modelo 'presentation.update' já valida se o user.id
    // é o 'created_by_user_id'.
    const updatedPres = await presentation.update(
      presentation_id,
      req.body,
      user.id,
    );

    const filteredOutput = authorization.filterOutput(
      user,
      "update:presentation", //
      updatedPres,
    );
    res.status(200).json(filteredOutput);
  } catch (error) {
    controller.errorsHandlers.onError(error, req, res);
  }
}

/**
 * Handler para DELETE /api/v1/presentations/[id]
 * Deleta uma apresentação.
 */
async function deleteHandler(req, res) {
  try {
    const user = req.context.user;
    const { id: presentation_id } = req.query;

    // O modelo 'presentation.del' também valida a propriedade.
    const deletedPres = await presentation.del(presentation_id, user.id);

    const filteredOutput = authorization.filterOutput(
      user,
      "delete:presentation", //
      deletedPres,
    );
    res.status(200).json(filteredOutput);
  } catch (error) {
    controller.errorsHandlers.onError(error, req, res);
  }
}
