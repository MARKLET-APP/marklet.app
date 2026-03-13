import { Router, type IRouter } from "express";
import multer from "multer";
import fs from "fs";
import path from "path";
import { checkImageSafety, detectCar } from "../lib/openai.js";

const router: IRouter = Router();

const upload = multer({ dest: "uploads/" });

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

  const ext = path.extname(req.file.originalname) || ".jpg";
  const newPath = filePath + ext;
  fs.renameSync(filePath, newPath);

  res.json({ url: `/api/uploads/${path.basename(newPath)}` });
});

export default router;
