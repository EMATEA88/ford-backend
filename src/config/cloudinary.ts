import { v2 as cloudinary } from "cloudinary";

/**
 * Cloudinary configuration
 * Usa APENAS a variável CLOUDINARY_URL
 * Exemplo:
 * cloudinary://API_KEY:API_SECRET@CLOUD_NAME
 */
if (!process.env.CLOUDINARY_URL) {
  throw new Error(
    "Cloudinary env var ausente: CLOUDINARY_URL"
  );
}

cloudinary.config({
  url: process.env.CLOUDINARY_URL,
});

export default cloudinary;
