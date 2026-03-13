import { Router, type IRouter } from "express";
import multer from "multer";
import fs from "fs";
import path from "path";
import { detectCar } from "../lib/openai.js";

const router: IRouter = Router();

const upload = multer({ dest: "uploads/" });

router.post("/upload", upload.single("image"), async (req, res): Promise<void> => {
  if (!req.file) {
    res.status(400).json({ error: "لم يتم رفع أي ملف" });
    return;
  }

  const isCar = await detectCar(req.file.path);

  if (!isCar) {
    fs.unlinkSync(req.file.path);
    res.status(400).json({ error: "الصورة لا تحتوي على سيارة. يرجى رفع صورة سيارة فقط." });
    return;
  }

  const ext = path.extname(req.file.originalname) || ".jpg";
  const newPath = req.file.path + ext;
  fs.renameSync(req.file.path, newPath);

  res.json({ url: `/api/uploads/${path.basename(newPath)}` });
});

export default router;
