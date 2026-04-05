import { Router, type IRouter } from "express";
import fs from "fs";
import path from "path";
import multer from "multer";
import { upload, processImage } from "../middlewares/upload.js";
import { checkImageSafety, detectCar } from "../lib/openai.js";

const router: IRouter = Router();

// ── CV / document upload (disk storage, PDF+Word only) ───────────────────────
const cvStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    const dir = path.join("uploads", "cv");
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || ".pdf";
    cb(null, `${Date.now()}${ext}`);
  },
});

const cvUpload = multer({
  storage: cvStorage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ];
    if (allowed.includes(file.mimetype)) cb(null, true);
    else cb(new Error("يُسمح فقط بملفات PDF أو Word"));
  },
});

router.post("/upload-cv", cvUpload.single("file"), (req: any, res: any): void => {
  if (!req.file) {
    res.status(400).json({ success: false, message: "لم يتم رفع أي ملف" });
    return;
  }
  const url = `/api/uploads/cv/${req.file.filename}`;
  res.json({ success: true, url });
});

// ── Car image upload — with AI safety check + car detection ──────────────────
router.post("/upload", upload.single("image"), async (req, res): Promise<void> => {
  if (!req.file) {
    res.status(400).json({ success: false, message: "لم يتم رفع أي ملف" });
    return;
  }

  const tmpPath = path.join("uploads", `tmp_${Date.now()}`);
  fs.mkdirSync("uploads", { recursive: true });
  fs.writeFileSync(tmpPath, req.file.buffer);

  try {
    const safe = await checkImageSafety(tmpPath);
    if (!safe) {
      fs.unlinkSync(tmpPath);
      res.status(400).json({ success: false, message: "الصورة غير مناسبة" });
      return;
    }

    const isCar = await detectCar(tmpPath);
    if (!isCar) {
      fs.unlinkSync(tmpPath);
      res.status(400).json({ success: false, message: "الصور يجب أن تكون لسيارة" });
      return;
    }

    fs.unlinkSync(tmpPath);

    // Save to disk → return a URL (not base64) for better mobile performance
    const imageUrl = await processImage(req.file, "cars");
    res.json({ success: true, image: imageUrl, url: imageUrl });
  } catch (err) {
    console.error("[Upload] Error:", err);
    if (fs.existsSync(tmpPath)) fs.unlinkSync(tmpPath);
    res.status(500).json({ success: false, message: "فشل معالجة الصورة" });
  }
});

// ── General image upload — no car detection, saves to disk ───────────────────
// POST /api/upload-image?folder=real-estate|jobs|marketplace|listings
router.post("/upload-image", upload.single("image"), async (req, res): Promise<void> => {
  if (!req.file) {
    res.status(400).json({ success: false, message: "لم يتم رفع أي ملف" });
    return;
  }

  const rawFolder = (req.query["folder"] as string) || "listings";
  const folder = rawFolder.replace(/[^a-z0-9_-]/gi, "").slice(0, 32) || "listings";

  try {
    const url = await processImage(req.file, folder);
    res.json({ success: true, url, image: url });
  } catch (err) {
    console.error("[Upload-Image] Error:", err);
    res.status(500).json({ success: false, message: "فشل رفع الصورة" });
  }
});

// Multer error handler — must be 4-arg to be treated as an error middleware
router.use((err: any, _req: any, res: any, next: any) => {
  if (err && err.code === "LIMIT_FILE_SIZE") {
    res.status(400).json({ success: false, message: "حجم الملف كبير جداً (الحد الأقصى 20 ميجابايت)" });
    return;
  }
  if (err && err.message) {
    res.status(400).json({ success: false, message: err.message });
    return;
  }
  next(err);
});

export default router;
