import { createRouter } from "next-connect";
import controller from "models/controller.js";
import authentication from "models/authentication.js";
import authorization from "models/authorization.js";
import scene from "models/scene.js";
import presentation from "models/presentation.js";
import validator from "models/validator.js";
import { NotFoundError, UnauthorizedError } from "errors/index.js";

const router = createRouter()
  .use(authentication.injectAnonymousOrUser)
  .use(authentication.checkIfUserPasswordExpired);

// --- Rota POST (Clonar Cena) ---
router.post(
  validateUserLogged,
  authorization.canRequest("create:scene"),
  validateRequest,
  postHandler,
);

export default router.handler(controller.errorsHandlers);

function validateUserLogged(req, res, next) {
  const user = req.context.user;
  if (!user.id) {
    throw new UnauthorizedError({
      message: "Você precisa estar logado para ver esta apresentação privada.",
    });
  }
  next();
}

/**
 * Middleware de validação do ID da URL e do Body.
 */
async function validateRequest(req, res, next) {
  try {
    // 1. Validar ID da URL (Apresentação de Destino)

    req.query = validator(
      { targetPresentationId: req.query?.id },
      { targetPresentationId: "required" },
    );

    // 2. Validar o Body
    req.body = validator(req.body, {
      sceneData: "required",
      pasteOption: "required",
    });

    // 3. Validar se a Apresentação de Destino existe
    const targetPresentation = await presentation.findById(
      req.query.targetPresentationId,
    );
    if (!targetPresentation) {
      throw new NotFoundError({
        message: "Apresentação de destino não encontrada.",
      });
    }

    // 4. Validar se a Cena Fonte (no body) existe
    // (Isso é crucial para evitar que dados arbitrários sejam injetados)
    // Usamos o 'findDeepById' do presentation.js para pegar os dados aninhados
    const sourcePresentation = await presentation.findDeepById(
      req.body.sceneData?.presentation_id,
    );
    const sourceScene = sourcePresentation?.scenes.find(
      (s) => s.id === req.body.sceneData?.id,
    );

    if (!sourceScene) {
      throw new NotFoundError({
        message: "A cena de origem (clipboard) não foi encontrada.",
      });
    }

    // (Anexa a cena completa e validada ao request para o handler usar)
    req.sourceScene = sourceScene;

    next();
  } catch (error) {
    controller.errorsHandlers.onError(error, req, res);
  }
}

/**
 * Handler para POST /api/v1/presentations/[id]/scenes/clone
 * Executa a transação de clonagem.
 */
async function postHandler(req, res) {
  try {
    const { targetPresentationId } = req.query;
    const { pasteOption } = req.body;
    // (req.sourceScene foi anexado e validado pelo middleware)
    const sourceSceneData = req.sourceScene;

    // 1. Determinar a 'order' da nova cena
    // (Busca a cena com a 'order' mais alta na apresentação de destino)
    const scenesInTarget =
      await scene.findAllFromPresentation(targetPresentationId);
    const newOrder =
      scenesInTarget.length > 0
        ? Math.max(...scenesInTarget.map((s) => s.order)) + 1
        : 0;

    // 2. Chamar a transação do modelo
    const newClonedScene = await scene.clone(
      sourceSceneData,
      targetPresentationId,
      pasteOption,
      newOrder,
    );

    // 3. Reordenar (assincronamente)
    // (Precisamos adicionar a nova cena ao final da lista de IDs
    // e reordenar tudo para garantir consistência)
    const allSceneIds = scenesInTarget.map((s) => s.id);
    allSceneIds.push(newClonedScene.id);

    // (Não precisamos 'await' isso, pode rodar em background)
    presentation.reorderScenes(targetPresentationId, allSceneIds);

    // 4. Retornar a nova cena (sem os detalhes aninhados)
    res.status(201).json(newClonedScene);
  } catch (error) {
    controller.errorsHandlers.onError(error, req, res);
  }
}
