import { createRouter } from "next-connect";
import multer from "multer";
import controller from "models/controller.js";
import authentication from "models/authentication.js";
import authorization from "models/authorization.js";
import product from "models/product.js";
import uploadService from "services/upload.js";
import validator from "models/validator.js";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
});

const router = createRouter();

// Middlewares Globais
router
  .use(authentication.injectAnonymousOrUser) // Garante que temos user ou anonymous com features
  .use(authentication.checkIfUserPasswordExpired);

// --- ROTA GET: Listagem (Protegida por Feature) ---
router.get(
  // 1. Validação de Acesso Geral à Loja
  authorization.canRequest("shop:consumer:view"),
  // 2. Validação de Parâmetros
  validateGetQuery,
  // 3. Handler
  getHandler,
);

// --- ROTA POST: Criação (Admin) ---
router.post(
  authorization.canRequest("shop:products:manage"),
  upload.array("files"),
  validateProductBody,
  postHandler,
);

export const config = {
  api: {
    bodyParser: false,
  },
};

export default router.handler(controller.errorsHandlers);

function validateGetQuery(req, res, next) {
  try {
    const query = req.query || {};
    const preparedQuery = {
      ...query,
      limit: query.limit ? parseInt(query.limit) : 20,
      offset: query.offset ? parseInt(query.offset) : 0,
      is_active:
        query.isActive === "true"
          ? true
          : query.isActive === "false"
            ? false
            : undefined,
    };

    if (preparedQuery.is_active === undefined) {
      delete preparedQuery.is_active;
    }

    req.cleanQuery = validator(preparedQuery, {
      limit: "optional",
      offset: "optional",
      category: "optional",
      is_active: "optional",
    });

    next();
  } catch (error) {
    controller.errorsHandlers.onError(error, req, res);
  }
}

async function getHandler(req, res) {
  try {
    const { limit, offset, category, is_active: isActive } = req.cleanQuery;

    // Extrai as features do usuário (injetado pelo middleware de autenticação)
    // Se for anonymous, ele terá as features padrão do createAnonymous()
    const userFeatures = req.context?.user?.features || [];

    const result = await product.findAll({
      limit,
      offset,
      category,
      isActive,
      userFeatures, // Passamos as features para o model filtrar a visibilidade
    });
    res.status(200).json(result);
  } catch (error) {
    controller.errorsHandlers.onError(error, req, res);
  }
}

// ... (validateProductBody e postHandler iguais ao anterior)
function validateProductBody(req, res, next) {
  try {
    const body = req.body || {};
    const preparedData = {
      ...body,
      price_in_cents: Number(body.price_in_cents),
      minimum_price_in_cents: body.minimum_price_in_cents
        ? Number(body.minimum_price_in_cents)
        : 0,
      promotional_price_in_cents: body.promotional_price_in_cents
        ? Number(body.promotional_price_in_cents)
        : null,
      stock_quantity: Number(body.stock_quantity),
      purchase_limit_per_user: body.purchase_limit_per_user
        ? Number(body.purchase_limit_per_user)
        : null,
      weight_in_grams: Number(body.weight_in_grams),
      length_cm: Number(body.length_cm),
      height_cm: Number(body.height_cm),
      width_cm: Number(body.width_cm),
      production_days: body.production_days ? Number(body.production_days) : 0,
      is_active: body.is_active === "true" || body.is_active === true,
    };

    if (typeof body.tags === "string") {
      try {
        preparedData.tags = JSON.parse(body.tags);
      } catch {
        preparedData.tags = [];
      }
    }
    if (typeof body.allowed_features === "string") {
      try {
        preparedData.allowed_features = JSON.parse(body.allowed_features);
      } catch {
        preparedData.allowed_features = [];
      }
    }

    req.cleanBody = validator(preparedData, {
      name: "required",
      slug: "required",
      description: "required",
      category: "required",
      price_in_cents: "required",
      minimum_price_in_cents: "required",
      stock_quantity: "required",
      weight_in_grams: "required",
      length_cm: "required",
      height_cm: "required",
      width_cm: "required",
      promotional_price_in_cents: "optional",
      purchase_limit_per_user: "optional",
      production_days: "optional",
      tags: "optional",
      allowed_features: "optional",
      available_at: "optional",
      unavailable_at: "optional",
      is_active: "optional",
    });

    next();
  } catch (error) {
    controller.errorsHandlers.onError(error, req, res);
  }
}

async function postHandler(req, res) {
  try {
    const files = req.files || [];
    const productData = req.cleanBody;
    const uploadedImages = [];

    if (files.length > 0) {
      const uploadPromises = files.map((file) =>
        uploadService.uploadImage(file.buffer, "rakusaipage/products"),
      );
      const results = await Promise.all(uploadPromises);
      results.forEach((result, index) => {
        uploadedImages.push({
          url: result.secure_url,
          public_id: result.public_id,
          alt: `${productData.name} - Imagem ${index + 1}`,
          is_cover: index === 0,
        });
      });
    }
    productData.images = uploadedImages;
    const newProduct = await product.create(productData);
    return res.status(201).json(newProduct);
  } catch (error) {
    controller.errorsHandlers.onError(error, req, res);
  }
}
