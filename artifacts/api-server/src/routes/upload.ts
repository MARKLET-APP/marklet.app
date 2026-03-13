import { Router, type IRouter } from "express";
import multer from "multer";

const router: IRouter = Router();

const upload = multer({ dest: "uploads/" });

router.post("/upload", upload.single("image"), (req, res): void => {
  res.json({ url: req.file!.path });
});

export default router;
