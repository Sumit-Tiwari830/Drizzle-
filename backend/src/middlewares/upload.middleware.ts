import multer from "multer";
import { ApiError } from "../utils/apiError.js";

const storage = multer.memoryStorage();

/**
 * Middleware for Admin Master Directory Excel Uploads
 */
export const uploadExcel = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB limit
  fileFilter: (req: any, file: any, cb: any) => {
    if (
      file.mimetype === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
      file.mimetype === "application/vnd.ms-excel" ||
      file.originalname.endsWith(".xlsx") ||
      file.originalname.endsWith(".xls") ||
      file.originalname.endsWith(".csv")
    ) {
      cb(null, true);
    } else {
      cb(new ApiError(400, "Only Excel files (.xlsx, .xls, .csv) are allowed"));
    }
  },
});

/**
 * Middleware for User Profile Photos & Avatar Uploads (Cloudinary Pipeline)
 */
export const uploadImage = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB max per photo
  fileFilter: (req: any, file: any, cb: any) => {
    const allowedMimeTypes = ["image/jpeg", "image/png", "image/webp", "image/jpg"];
    if (allowedMimeTypes.includes(file.mimetype.toLowerCase())) {
      cb(null, true);
    } else {
      cb(new ApiError(400, "Invalid image format. Only JPEG, PNG, and WebP are allowed."));
    }
  },
});
