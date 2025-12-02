import { createRouter } from "next-connect";
import controller from "models/controller.js";
import authentication from "models/authentication.js";
import authorization from "models/authorization.js";
import subscription from "models/subscription.js";

const router = createRouter()
  .use(authentication.injectAnonymousOrUser)
  .use(authentication.checkIfUserPasswordExpired);

// Protegido por permissão de leitura de assinaturas de outros
router.get(authorization.canRequest("read:subscription:other"), getHandler);

export default router.handler(controller.errorsHandlers);

async function getHandler(req, res) {
  try {
    const usersStatus = await subscription.findUsersWithSubscriptionCount();

    // Filtramos a saída para garantir que apenas dados seguros sejam retornados
    // (Embora nossa query SQL já seja específica, é boa prática passar pelo filtro se configurado)
    const filteredOutput = usersStatus.map((info) =>
      authorization.filterOutput(
        req.context.user,
        "read:subscription:other",
        info,
      ),
    );

    res.status(200).json(filteredOutput);
  } catch (error) {
    controller.errorsHandlers(error, req, res);
  }
}
