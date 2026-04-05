import { Router, type IRouter } from "express";
import multer from "multer";
import path from "path";
import { upload, processImage } from "../middlewares/upload.js";
import { uploadBufferToGCS } from "../lib/gcsUpload.js";

const router: IRouter = Router();

// ── CV / document upload (GCS) ───────────────────────────────────────────────
const cvUpload = multer({
  storage: multer.memoryStorage(),
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

router.post("/upload-cv", cvUpload.single("file"), async (req: any, res: any): Promise<void> => {
  if (!req.file) {
    res.status(400).json({ success: false, message: "لم يتم رفع أي ملف" });
    return;
  }
  try {
    const ext = path.extname(req.file.originalname).slice(1) || "pdf";
    const url = await uploadBufferToGCS(req.file.buffer, "cv", ext, req.file.mimetype || "application/pdf");
    res.json({ success: true, url });
  } catch (err) {
    console.error("[CV Upload] Error:", err);
    res.status(500).json({ success: false, message: "فشل رفع الملف" });
  }
});

// ── Car image upload — direct save, no AI detection ──────────────────────────
router.post("/upload", upload.single("image"), async (req, res): Promise<void> => {
  if (!req.file) {
    res.status(400).json({ success: false, message: "لم يتم رفع أي ملف" });
    return;
  }
  try {
    const imageUrl = await processImage(req.file, "cars");
    res.json({ success: true, image: imageUrl, url: imageUrl });
  } catch (err) {
    console.error("[Upload] Error:", err);
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
