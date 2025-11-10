import { createRouter } from "next-connect";
import controller from "models/controller.js";
import authentication from "models/authentication.js";
import authorization from "models/authorization.js";
import sceneElement from "models/scene_element.js";
import validator from "models/validator.js";
import { NotFoundError } from "errors/index.js"; // Importação necessária

const router = createRouter()
  .use(authentication.injectAnonymousOrUser)
  .use(authentication.checkIfUserPasswordExpired);

// --- (NOVO) Rota GET (Buscar Elemento) ---
router.get(
  // Foco em Segurança: Assumimos que o usuário deve ter permissão
  // de 'ler' elementos para buscar um ID específico.
  // Se a feature 'read:element' não existir, podemos usar 'read:presentation'.
  authorization.canRequest("read:element"),
  elementIdValidator,
  getHandler,
);

// --- Rota PATCH (Atualizar Elemento) ---
// Este handler permanece IDÊNTICO.
// A lógica de transação (atualizar scene_elements E element_groups)
// já está no model 'sceneElement.update'.
router.patch(
  authorization.canRequest("update:element"),
  elementIdValidator,
  patchHandler,
);

// --- Rota DELETE (Deletar Elemento) ---
// Este handler permanece IDÊNTICO.
// A lógica de transação (deletar grupo órfão)
// já está no model 'sceneElement.del'.
router.delete(
  authorization.canRequest("delete:element"),
  elementIdValidator,
  deleteHandler,
);

export default router.handler(controller.errorsHandlers);

function elementIdValidator(req, res, next) {
  req.query = validator({ id: req.query?.id }, { id: "required" });
  next();
}

/**
 * (NOVO) Handler para GET /api/v1/scene_elements/[id]
 * Busca um elemento e seus dados de grupo (JOIN).
 */
async function getHandler(req, res) {
  try {
    const { id: element_id } = req.query;

    // O 'sceneElement.findById' refatorado agora executa o JOIN
    // com 'element_groups' para buscar display_name e assigned_user_id.
    const element = await sceneElement.findById(element_id);

    // Precisamos checar se o elemento foi encontrado,
    // pois 'findById' retorna undefined se não achar.
    if (!element) {
      throw new NotFoundError({ message: "Elemento de cena não encontrado." });
    }

    res.status(200).json(element);
  } catch (error) {
    controller.errorsHandlers.onError(error, req, res);
  }
}

/**
 * Handler para PATCH /api/v1/scene_elements/[id]
 * (Sem alterações)
 */
async function patchHandler(req, res) {
  try {
    const { id: element_id } = req.query;
    const updatedElement = await sceneElement.update(element_id, req.body);
    res.status(200).json(updatedElement);
  } catch (error) {
    controller.errorsHandlers.onError(error, req, res);
  }
}

/**
 * Handler para DELETE /api/v1/scene_elements/[id]
 * (Sem alterações)
 */
async function deleteHandler(req, res) {
  try {
    const { id: element_id } = req.query;
    const deletedElement = await sceneElement.del(element_id);
    res.status(200).json(deletedElement);
  } catch (error) {
    controller.errorsHandlers.onError(error, req, res);
  }
}
