import { Router, type IRouter } from "express";
import multer from "multer";
import fs from "fs";
import path from "path";
import sharp from "sharp";
import { checkImageSafety, detectCar } from "../lib/openai.js";

const router: IRouter = Router();

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

router.post("/upload", upload.single("image"), async (req, res): Promise<void> => {
  if (!req.file) {
    res.status(400).json({ error: "لم يتم رفع أي ملف" });
    return;
  }

  const tmpPath = path.join("uploads", `tmp_${Date.now()}`);
  fs.mkdirSync("uploads", { recursive: true });
  fs.writeFileSync(tmpPath, req.file.buffer);

  try {
    const safe = await checkImageSafety(tmpPath);
    if (!safe) {
      fs.unlinkSync(tmpPath);
      res.status(400).json({ error: "الصورة غير مناسبة" });
      return;
    }

    const isCar = await detectCar(tmpPath);
    if (!isCar) {
      fs.unlinkSync(tmpPath);
      res.status(400).json({ error: "الصور يجب أن تكون لسيارة" });
      return;
    }

    fs.unlinkSync(tmpPath);

    const url = await processImage(req.file, "uploads");
    res.json({ url });
  } catch (err) {
    console.error("[Upload] Error:", err);
    if (fs.existsSync(tmpPath)) fs.unlinkSync(tmpPath);
    res.status(500).json({ error: "فشل معالجة الصورة" });
  }
});

export default router;
