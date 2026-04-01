import { Router, type IRouter } from "express";
import fs from "fs";
import path from "path";
import { upload, processImage } from "../middlewares/upload.js";
import { checkImageSafety, detectCar } from "../lib/openai.js";

const router: IRouter = Router();

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

    const image = await processImage(req.file, "cars");
    res.json({ success: true, image });
  } catch (err) {
    console.error("[Upload] Error:", err);
    if (fs.existsSync(tmpPath)) fs.unlinkSync(tmpPath);
    res.status(500).json({ success: false, message: "فشل معالجة الصورة" });
  }
});

// ── General image upload — no car detection, any folder ──────────────────────
// POST /api/upload-image?folder=real-estate|jobs|listings
router.post("/upload-image", upload.single("image"), async (req, res): Promise<void> => {
  if (!req.file) {
    res.status(400).json({ success: false, message: "لم يتم رفع أي ملف" });
    return;
  }

  const rawFolder = (req.query["folder"] as string) || "listings";
  const folder = rawFolder.replace(/[^a-z0-9_-]/gi, "").slice(0, 32) || "listings";

  try {
    const url = await processImage(req.file, folder);
    res.json({ success: true, url });
  } catch (err) {
    console.error("[Upload-Image] Error:", err);
    res.status(500).json({ success: false, message: "فشل رفع الصورة" });
  }
});

export default router;
