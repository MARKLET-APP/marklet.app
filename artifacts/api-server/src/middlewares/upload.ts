import multer from "multer";
import sharp from "sharp";
import path from "path";
import fs from "fs";

const storage = multer.memoryStorage();

export const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
  fileFilter: (_req, file, cb) => {
    if (/jpeg|jpg|png|gif|webp|heic|heif/.test(file.mimetype)) cb(null, true);
    else cb(new Error("نوع الملف غير مدعوم"));
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
