import { v2 as cloudinary } from "cloudinary";
import dotenv from "dotenv";
import { ApiError } from "../utils/apiError.js";

dotenv.config();

// Configure Cloudinary with sanitized environment variables
cloudinary.config({
  cloud_name: (process.env.CLOUDINARY_CLOUD_NAME || "").trim(),
  api_key: (process.env.CLOUDINARY_API_KEY || "").trim(),
  api_secret: (process.env.CLOUDINARY_API_SECRET || "").trim(),
  secure: true,
});

export class CloudinaryService {
  /**
   * Upload an in-memory image buffer directly to Cloudinary using streaming.
   * Eliminates the need to write temporary files to disk.
   */
  static uploadStream(
    buffer: Buffer,
    folder: string = "dating_app/profiles",
    transformationOptions: Record<string, any>[] = [
      { width: 1080, height: 1080, crop: "limit" },
      { quality: "auto" },
      { fetch_format: "auto" },
    ]
  ): Promise<{ secure_url: string; public_id: string; format: string }> {
    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder,
          resource_type: "image",
          transformation: transformationOptions,
        },
        (error, result) => {
          if (error || !result) {
            return reject(
              new ApiError(500, `Cloudinary upload failed: ${error?.message || "Unknown error"}`)
            );
          }
          resolve({
            secure_url: result.secure_url,
            public_id: result.public_id,
            format: result.format,
          });
        }
      );

      uploadStream.end(buffer);
    });
  }

  /**
   * Delete an image from Cloudinary using its public_id
   */
  static async deleteImage(publicId: string): Promise<any> {
    try {
      return await cloudinary.uploader.destroy(publicId);
    } catch (err: any) {
      console.warn(`[CloudinaryService] Failed to delete image ${publicId}:`, err?.message || err);
      return null;
    }
  }

  /**
   * Helper: Extracts Cloudinary public_id from secure_url
   */
  static extractPublicId(url: string): string | null {
    if (!url || typeof url !== "string") return null;
    try {
      const parts = url.split("/");
      const uploadIndex = parts.indexOf("upload");
      if (uploadIndex === -1) return null;

      const afterUpload = parts.slice(uploadIndex + 1);
      // If version segment (e.g. v1731678123) is present, skip it
      if (afterUpload[0] && /^v\d+$/.test(afterUpload[0])) {
        afterUpload.shift();
      }

      const pathWithExt = afterUpload.join("/");
      const lastDot = pathWithExt.lastIndexOf(".");
      return lastDot !== -1 ? pathWithExt.substring(0, lastDot) : pathWithExt;
    } catch {
      return null;
    }
  }
}
