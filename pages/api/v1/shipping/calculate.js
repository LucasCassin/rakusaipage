import { createRouter } from "next-connect";
import controller from "models/controller.js";
import authentication from "models/authentication.js";
import validator from "models/validator.js";
import shippingService from "services/shipping.js";
import { ValidationError } from "errors/index.js";
import authorization from "models/authorization.js";
import productModel from "models/product.js";

const router = createRouter();

// Permite usuários anônimos calcularem frete
router.use(authentication.injectAnonymousOrUser);

router.post(
  authorization.canRequest("shop:consumer:view"),
  validateShippingBody,
  calculateHandler,
);

export default router.handler(controller.errorsHandlers);

function validateShippingBody(req, res, next) {
  try {
    const body = req.body || {};

    const dataToValidate = {
      ...body,
      shop_items: body.items,
    };

    const cleanData = validator(dataToValidate, {
      zip_code: "required",
      shop_items: "required",
    });

    req.cleanBody = {
      zip_code: cleanData.zip_code,
      items: cleanData.shop_items,
    };

    next();
  } catch (error) {
    controller.errorsHandlers.onError(error, req, res);
  }
}

async function calculateHandler(req, res) {
  try {
    const { zip_code, items } = req.cleanBody;

    if (!Array.isArray(items) || items.length === 0) {
      throw new ValidationError({ message: "A lista de itens é obrigatória." });
    }

    // O serviço de frete foi refatorado para esperar os itens já enriquecidos
    // com os dados do produto. Como esta é uma rota de simulação pública,
    // precisamos buscar os dados do produto aqui antes de chamar o serviço.
    const enrichedItems = await Promise.all(
      items.map(async (item) => {
        const product = await productModel.findById(item.product_id);
        // O serviço de frete espera o objeto do produto enriquecido, mas sua
        // validação interna ainda checa por 'product_id'. Adicionamos ele aqui.
        return {
          ...product,
          product_id: item.product_id,
          quantity: item.quantity,
        };
      }),
    );

    const options = await shippingService.calculateShippingOptions(
      zip_code,
      enrichedItems,
    );

    res.status(200).json(options);
  } catch (error) {
    controller.errorsHandlers.onError(error, req, res);
  }
}
