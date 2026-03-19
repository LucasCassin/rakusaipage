import { createRouter } from "next-connect";
import multer from "multer";
import controller from "models/controller.js";
import authentication from "models/authentication.js";
import authorization from "models/authorization.js";
import product from "models/product.js";
import validator from "models/validator.js";
import uploadService from "services/upload.js";

// Configuração do Multer para processar multipart/form-data
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // Limite de 5MB
});
const router = createRouter();

router
  .use(authentication.injectAnonymousOrUser)
  .use(authentication.checkIfUserPasswordExpired)
  // Protege todos os métodos desta rota com a feature de gerenciamento de produtos
  .use(authorization.canRequest("shop:products:manage"));

// PUT: Atualizar Produto
router.put(upload.array("files"), validateUpdateInput, putHandler);

// DELETE: Remover Produto
router.delete(validateDeleteInput, deleteHandler);

function validateUpdateInput(req, res, next) {
  try {
    const body = req.body || {};
    // Helpers para conversão de tipos (multipart/form-data envia tudo como string)
    const parseNumber = (val) => (val ? Number(val) : undefined);
    const parseBool = (val) => {
      if (val === "true" || val === true) return true;
      if (val === "false" || val === false) return false;
      return undefined;
    };
    const parseJSON = (val) => {
      try {
        return typeof val === "string" ? JSON.parse(val) : val;
      } catch {
        return undefined;
      }
    };

    // Monta o objeto de dados convertendo os campos necessários
    const productData = {
      ...body,
      price_in_cents: parseNumber(body.price_in_cents),
      promotional_price_in_cents: parseNumber(body.promotional_price_in_cents),
      minimum_price_in_cents: parseNumber(body.minimum_price_in_cents),
      stock_quantity: parseNumber(body.stock_quantity),
      weight_in_grams: parseNumber(body.weight_in_grams),
      length_cm: parseNumber(body.length_cm),
      height_cm: parseNumber(body.height_cm),
      width_cm: parseNumber(body.width_cm),
      production_days: parseNumber(body.production_days),
      purchase_limit_per_user: parseNumber(body.purchase_limit_per_user),

      is_active: parseBool(body.is_active),
      allow_delivery: parseBool(body.allow_delivery),
      allow_pickup: parseBool(body.allow_pickup),

      tags: parseJSON(body.tags),
      allowed_features: parseJSON(body.allowed_features),
    };

    // Tratamento de imagens:
    // Se o front enviar 'images' como string JSON (ex: mantendo imagens antigas), fazemos o parse.
    // Nota: Se houver upload de novos arquivos (req.files), a lógica de upload para S3/Storage
    // deveria ser implementada aqui para gerar as URLs e adicionar ao array de imagens.
    if (body.images) {
      productData.images = parseJSON(body.images);
    }

    // Remove chaves undefined para não sobrescrever dados existentes com undefined
    Object.keys(productData).forEach(
      (key) => productData[key] === undefined && delete productData[key],
    );

    req.cleanBody = productData;
    next();
  } catch (error) {
    controller.errorsHandlers.onError(error, req, res);
  }
}

async function putHandler(req, res) {
  try {
    const { id } = req.query;
    const files = req.files || [];
    const productData = req.cleanBody;

    // Se houver novos arquivos, faz o upload e adiciona à lista de imagens
    if (files.length > 0) {
      const uploadPromises = files.map((file) =>
        uploadService.uploadImage(file.buffer, "rakusaipage/products"),
      );
      const results = await Promise.all(uploadPromises);

      const newImages = results.map((result, index) => ({
        url: result.secure_url,
        public_id: result.public_id,
        alt: `${productData.name || "Imagem"} - Nova ${index + 1}`,
        is_cover: false,
      }));

      productData.images = [...(productData.images || []), ...newImages];
    }

    const updatedProduct = await product.update(id, productData);
    res.status(200).json(updatedProduct);
  } catch (error) {
    controller.errorsHandlers.onError(error, req, res);
  }
}

function validateDeleteInput(req, res, next) {
  try {
    const { id } = req.query;
    validator({ id }, { id: "required" });
    next();
  } catch (error) {
    controller.errorsHandlers.onError(error, req, res);
  }
}

async function deleteHandler(req, res) {
  try {
    const { id } = req.query;
    const deletedProduct = await product.del(id);
    res.status(200).json(deletedProduct);
  } catch (error) {
    controller.errorsHandlers.onError(error, req, res);
  }
}

export default router.handler(controller.errorsHandlers);

// Necessário para o Multer funcionar no Next.js API Routes
export const config = {
  api: {
    bodyParser: false,
  },
};
