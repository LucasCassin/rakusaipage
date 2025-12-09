import { v2 as cloudinary } from "cloudinary";

// Configuração inicial (Lê variáveis de ambiente)
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

/**
 * Realiza o upload de uma imagem (Buffer ou Base64) para o Cloudinary.
 * @param {string|Buffer} file - O arquivo a ser enviado.
 * @param {string} folder - A pasta no Cloudinary (ex: 'rakusaipage/products').
 * @returns {Promise<Object>} - Retorna { url, public_id, width, height }.
 */
async function uploadImage(file, folder = "rakusaipage/uploads") {
  const options = {
    folder: folder,
    resource_type: "auto",
  };

  // Se for string (caminho ou base64), usa o método uploader.upload padrão
  if (typeof file === "string") {
    return cloudinary.uploader.upload(file, options);
  }

  // Se for Buffer (vindo de um form-data no Next.js API), usamos upload_stream
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      options,
      (error, result) => {
        if (error) return reject(error);
        resolve(result);
      },
    );
    // Escreve o buffer no stream de upload
    stream.write(file);
    stream.end();
  });
}

/**
 * Remove uma imagem do Cloudinary.
 * Útil quando um produto é deletado ou uma imagem é substituída.
 */
async function deleteImage(publicId) {
  if (!publicId) return;
  try {
    const result = await cloudinary.uploader.destroy(publicId);
    return result;
  } catch (error) {
    console.error("Erro ao deletar imagem do Cloudinary:", error);
    // Não lançamos erro para não quebrar o fluxo principal (soft fail)
    return null;
  }
}

export default {
  uploadImage,
  deleteImage,
};
