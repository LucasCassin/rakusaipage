import { createRouter } from "next-connect";
import controller from "models/controller.js";
import { getStatus } from "services/statusService.js";

const route = createRouter();
route.get(getHandler);
export default route.handler(controller.errorsHandlers);

async function getHandler(req, res) {
  const status = await getStatus();
  res.status(200).json(status);
}
