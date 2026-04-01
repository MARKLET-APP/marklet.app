import multer from "multer";
import sharp from "sharp";
import path from "path";
import fs from "fs";

const storage = multer.memoryStorage();

const IMAGE_MIME = /jpeg|jpg|png|gif|webp|heic|heif/i;
const IMAGE_EXT  = /\.(jpe?g|png|gif|webp|heic|heif)$/i;

export const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10 MB — camera RAW files can be large
  },
  fileFilter: (_req, file, cb) => {
    const mimeOk = IMAGE_MIME.test(file.mimetype);
    // Android camera sometimes sends application/octet-stream — fall back to extension check
    const extOk  = IMAGE_EXT.test(file.originalname);
    const isGeneric = file.mimetype === "application/octet-stream" || file.mimetype === "application/unknown";
    if (mimeOk || (isGeneric && extOk)) cb(null, true);
    else cb(new Error("نوع الملف غير مدعوم — يُسمح فقط بصور JPEG/PNG/WebP"));
  },
});

export const processImage = async (file: Express.Multer.File, folder = "uploads"): Promise<string> => {
  const fileName = Date.now() + ".jpg";
  const uploadPath = path.join("uploads", folder);

  if (!fs.existsSync(uploadPath)) {
    fs.mkdirSync(uploadPath, { recursive: true });
  }

  const finalPath = path.join(uploadPath, fileName);

  await sharp(file.buffer)
    .rotate()
    .resize({
      width: 1600,
      withoutEnlargement: true,
    })
    .jpeg({
      quality: 80,
      progressive: true,
    })
    .toFile(finalPath);

  return `/api/uploads/${folder}/${fileName}`;
};
