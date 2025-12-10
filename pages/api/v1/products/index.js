import { createRouter } from "next-connect";
import multer from "multer";
import controller from "models/controller.js";
import authentication from "models/authentication.js";
import authorization from "models/authorization.js";
import product from "models/product.js";
import uploadService from "services/upload.js";
import validator from "models/validator.js";

// Configuração do Multer (Armazena em memória para envio ao Cloudinary)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // Limite de 5MB por arquivo
  },
});

const router = createRouter();

// Middlewares Globais da Rota
router
  .use(authentication.injectAnonymousOrUser) // Nome correto conforme seu arquivo
  .use(authentication.checkIfUserPasswordExpired);

router.post(
  // 1. Segurança: Usa a feature correta definida em user-features.js
  authorization.canRequest("shop:products:manage"),

  // 2. Processamento de Arquivos: Lê o multipart/form-data
  upload.array("files"),

  // 3. Validação: Verifica os campos do corpo (req.body) após o Multer processar
  validateProductBody,

  // 4. Lógica: Salva no banco e nuvem
  postHandler,
);

export const config = {
  api: {
    bodyParser: false, // Necessário para o Multer funcionar no Next.js
  },
};

export default router.handler(controller.errorsHandlers);

/**
 * Middleware de validação para os dados do produto.
 * Realiza o parse de campos numéricos e valida tipos.
 */
function validateProductBody(req, res, next) {
  try {
    const body = req.body || {};

    // Como o form-data envia tudo como string, fazemos o cast para os tipos corretos
    // para que o validator.js possa validar corretamente (ex: Joi.number())
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
      // Tratamento de booleanos que vêm como string "true"/"false"
      is_active: body.is_active === "true" || body.is_active === true,
    };

    // Tratamento de Arrays (Tags e Features)
    // O form-data pode enviar como string JSON ou array
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

    // Validação usando o models/validator.js com as chaves existentes
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
      // Opcionais
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

/**
 * Handler para POST /api/v1/products
 */
async function postHandler(req, res) {
  try {
    const files = req.files || [];
    const productData = req.cleanBody;

    // 1. Upload das Imagens (se houver)
    const uploadedImages = [];

    if (files.length > 0) {
      // Envia para o Cloudinary em paralelo
      const uploadPromises = files.map((file) =>
        uploadService.uploadImage(file.buffer, "rakusaipage/products"),
      );

      const results = await Promise.all(uploadPromises);

      // Formata para o padrão JSONB do banco
      results.forEach((result, index) => {
        uploadedImages.push({
          url: result.secure_url,
          public_id: result.public_id,
          alt: `${productData.name} - Imagem ${index + 1}`,
          is_cover: index === 0, // Define a primeira como capa
        });
      });
    }

    // 2. Adiciona as imagens ao objeto do produto
    productData.images = uploadedImages;

    // 3. Persistência no Banco de Dados
    const newProduct = await product.create(productData);

    return res.status(201).json(newProduct);
  } catch (error) {
    controller.errorsHandlers.onError(error, req, res);
  }
}
