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

export default router;
