import { createRouter } from "next-connect";
import controller from "models/controller.js";
import authentication from "models/authentication.js";
import authorization from "models/authorization.js";
import presentation from "models/presentation.js";
import presentationViewer from "models/presentation_viewer.js";
import validator from "models/validator.js";
import {
  NotFoundError,
  ForbiddenError,
  UnauthorizedError,
} from "errors/index.js";

const router = createRouter()
  .use(authentication.injectAnonymousOrUser)
  .use(authentication.checkIfUserPasswordExpired);

// --- Rotas ---
// A lógica de autorização de leitura é complexa e
// é tratada DIRETAMENTE dentro do "getHandler".
router.get(presentationIdValidator, getHandler);

// Rotas de escrita usam "canRequest" com a "chave" limpa.
router.patch(
  authorization.canRequest("update:presentation"),
  presentationIdValidator,
  patchHandler,
);
router.delete(
  authorization.canRequest("delete:presentation"),
  presentationIdValidator,
  deleteHandler,
);

export default router.handler(controller.errorsHandlers);

function presentationIdValidator(req, res, next) {
  req.query = validator(
    { presentation_id: req.query?.id },
    { presentation_id: "required" },
  );
  next();
}

/**
 * Handler para GET /api/v1/presentations/[id]
 * Implementa a nova lógica de leitura:
 * 1. Admin (chave mestra) pode ver tudo.
 * 2. Usuário padrão (com chave) pode ver se for pública OU se estiver no elenco.
 */
async function getHandler(req, res) {
  try {
    const user = req.context.user;
    const { presentation_id } = req.query;

    const presentationData = await presentation.findDeepById(presentation_id);
    if (!presentationData) {
      throw new NotFoundError({ message: "Apresentação não encontrada." });
    }

    // --- NOVA LÓGICA DE LEITURA ---

    // 1. Chave Mestra (Admin)
    // O admin pode ver tudo, ponto final.
    if (authorization.can(user, "read:presentation:admin")) {
      const filteredOutput = authorization.filterOutput(
        user,
        "read:presentation:admin", // Usa o perfil de admin (mais campos)
        presentationData,
      );
      // Adiciona os dados aninhados (cenas, etc.) de volta após a filtragem
      filteredOutput.scenes = presentationData.scenes;
      return res.status(200).json(filteredOutput);
    }

    // 2. Chave Padrão (Aluno ou Anônimo)
    // Precisa ter a chave "read:presentation" E atender aos critérios
    if (authorization.can(user, "read:presentation")) {
      const isPublic = presentationData.is_public;
      const isActive = presentationData.is_active;
      let isViewer = false;

      // Só podemos checar o elenco se o usuário estiver logado (tem user.id)
      if (user.id) {
        const viewerList =
          await presentationViewer.findByPresentationId(presentation_id);
        isViewer = viewerList.some((viewer) => viewer.id === user.id);
      }

      // PERMITE o acesso se for pública OU (logado E no elenco)
      if ((isPublic || isViewer) && isActive) {
        const filteredOutput = authorization.filterOutput(
          user,
          "read:presentation", // Usa o perfil padrão (menos campos)
          presentationData,
        );
        filteredOutput.scenes = presentationData.scenes;
        return res.status(200).json(filteredOutput);
      }
    }
    // --- FIM DA NOVA LÓGICA ---

    // 3. Acesso Negado
    // Se não caiu em nenhuma regra, nega o acesso.
    if (!user.id) {
      throw new UnauthorizedError({
        message:
          "Você precisa estar logado para ver esta apresentação privada.",
      });
    }
    throw new ForbiddenError({
      message: "Você não tem permissão para ver esta apresentação.",
    });
  } catch (error) {
    controller.errorsHandlers.onError(error, req, res);
  }
}

/**
 * Handler para PATCH /api/v1/presentations/[id]
 * Atualiza uma apresentação.
 */
async function patchHandler(req, res) {
  try {
    const user = req.context.user;
    const { presentation_id } = req.query;

    // Lógica de "dono" removida. O canRequest() já cuidou da permissão.
    // O modelo "update" cuidará do 404 se o ID estiver errado.
    const updatedPres = await presentation.update(presentation_id, req.body);

    // Filtra a saída com a "chave" de escrita
    const filteredOutput = authorization.filterOutput(
      user,
      "update:presentation",
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
    const { presentation_id } = req.query;

    // Lógica de "dono" removida. O canRequest() já cuidou da permissão.
    // O modelo "del" cuidará do 404.
    const deletedPres = await presentation.del(presentation_id);

    const filteredOutput = authorization.filterOutput(
      user,
      "delete:presentation",
      deletedPres, // O 'del' retorna { id: ... }
    );
    res.status(200).json(filteredOutput);
  } catch (error) {
    controller.errorsHandlers.onError(error, req, res);
  }
}
