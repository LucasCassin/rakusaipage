import { createRouter } from "next-connect";
import controller from "models/controller.js";
import authentication from "models/authentication.js";
import elementType from "models/element_type.js"; //
import { UnauthorizedError } from "errors/index.js";

const router = createRouter()
  .use(authentication.injectAnonymousOrUser)
  .use(authentication.checkIfUserPasswordExpired);

// --- Rota GET (Listar todos os Tipos de Elementos) ---
router.get(async (req, res, next) => {
  if (!req.context.user.id) {
    throw new UnauthorizedError({ message: "Usuário não autenticado." });
  }
  next();
}, getHandler);

export default router.handler(controller.errorsHandlers);

/**
 * Handler para GET /api/v1/element-types
 * Busca todos os tipos de elementos (Odaiko, Shime, etc.) do banco.
 */
async function getHandler(req, res) {
  try {
    // Chama a função que já existe no seu modelo
    const allTypes = await elementType.findAll();
    res.status(200).json(allTypes);
  } catch (error) {
    controller.errorsHandlers.onError(error, req, res);
  }
}
