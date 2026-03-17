import { Router, type IRouter } from "express";
import multer from "multer";
import fs from "fs";
import path from "path";
import sharp from "sharp";
import { checkImageSafety, detectCar } from "../lib/openai.js";

const router: IRouter = Router();

const upload = multer({
  dest: "uploads/",
  limits: { fileSize: 15 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (/jpeg|jpg|png|gif|webp|heic|heif/.test(file.mimetype)) cb(null, true);
    else cb(new Error("نوع الملف غير مدعوم"));
  },
});

async function compressImage(inputPath: string, outputPath: string): Promise<void> {
  await sharp(inputPath)
    .rotate()
    .resize(1920, 1080, { fit: "inside", withoutEnlargement: true })
    .jpeg({ quality: 82, progressive: true, mozjpeg: true })
    .toFile(outputPath);
}

router.post("/upload", upload.single("image"), async (req, res): Promise<void> => {
  if (!req.file) {
    res.status(400).json({ error: "لم يتم رفع أي ملف" });
    return;
  }

  const filePath = req.file.path;

  const safe = await checkImageSafety(filePath);
  if (!safe) {
    fs.unlinkSync(filePath);
    res.status(400).json({ error: "الصورة غير مناسبة" });
    return;
  }

  const isCar = await detectCar(filePath);
  if (!isCar) {
    fs.unlinkSync(filePath);
    res.status(400).json({ error: "الصور يجب أن تكون لسيارة" });
    return;
  }

  const outputPath = filePath + ".jpg";
  try {
    await compressImage(filePath, outputPath);
    fs.unlinkSync(filePath);
    res.json({ url: `/api/uploads/${path.basename(outputPath)}` });
  } catch (err) {
    console.error("[Upload] Compression error:", err);
    const fallbackPath = filePath + (path.extname(req.file.originalname) || ".jpg");
    fs.renameSync(filePath, fallbackPath);
    res.json({ url: `/api/uploads/${path.basename(fallbackPath)}` });
  }
});

export default router;
