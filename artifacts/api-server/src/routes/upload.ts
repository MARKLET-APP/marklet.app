import { Router, type IRouter } from "express";
import path from "path";
import fs from "fs";
import { authMiddleware, type AuthRequest } from "../lib/auth.js";

const router: IRouter = Router();

router.post("/upload/image", authMiddleware, async (req: AuthRequest, res): Promise<void> => {
  const { data, filename } = req.body;
  
  if (!data) {
    res.status(400).json({ error: "Image data is required" });
    return;
  }

  const base64Data = data.replace(/^data:image\/\w+;base64,/, "");
  const ext = filename?.split(".").pop() ?? "jpg";
  const uniqueName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
  
  const uploadsDir = path.join(process.cwd(), "uploads");
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }

  const filePath = path.join(uploadsDir, uniqueName);
  fs.writeFileSync(filePath, base64Data, "base64");

  const url = `/api/uploads/${uniqueName}`;
  res.json({ url });
});

export default router;
