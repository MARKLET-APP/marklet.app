import { Router, type IRouter } from "express";
import { db, reelsTable, usersTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import multer from "multer";
import path from "path";
import fs from "fs";
import { authMiddleware, optionalAuthMiddleware as optionalAuth, type AuthRequest } from "../lib/auth.js";

const router: IRouter = Router();

// ── Video upload storage ────────────────────────────────────────────────────
const reelsDir = path.join(process.cwd(), "uploads", "reels");
if (!fs.existsSync(reelsDir)) fs.mkdirSync(reelsDir, { recursive: true });

const thumbsDir = path.join(process.cwd(), "uploads", "reels-thumbs");
if (!fs.existsSync(thumbsDir)) fs.mkdirSync(thumbsDir, { recursive: true });

const videoStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, reelsDir),
  filename: (_req, _file, cb) => cb(null, `${Date.now()}_${Math.random().toString(36).slice(2)}.mp4`),
});

const thumbStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, thumbsDir),
  filename: (_req, _file, cb) => cb(null, `${Date.now()}_${Math.random().toString(36).slice(2)}.jpg`),
});

const videoUpload = multer({
  storage: videoStorage,
  limits: { fileSize: 150 * 1024 * 1024 }, // 150 MB
  fileFilter: (_req, file, cb) => {
    if (/video\//.test(file.mimetype)) cb(null, true);
    else cb(new Error("يجب أن يكون الملف فيديو"));
  },
});

const thumbUpload = multer({
  storage: thumbStorage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (/image\//.test(file.mimetype)) cb(null, true);
    else cb(new Error("يجب أن تكون صورة"));
  },
});

// ── Public: list approved reels ─────────────────────────────────────────────
router.get("/reels", optionalAuth, async (_req, res): Promise<void> => {
  try {
    const rows = await db
      .select({
        id: reelsTable.id,
        videoUrl: reelsTable.videoUrl,
        thumbnailUrl: reelsTable.thumbnailUrl,
        title: reelsTable.title,
        desc: reelsTable.desc,
        price: reelsTable.price,
        city: reelsTable.city,
        dealerName: reelsTable.dealerName,
        dealerId: reelsTable.dealerId,
        sponsored: reelsTable.sponsored,
        views: reelsTable.views,
        likes: reelsTable.likes,
        status: reelsTable.status,
        createdAt: reelsTable.createdAt,
        uploaderName: usersTable.name,
      })
      .from(reelsTable)
      .leftJoin(usersTable, eq(reelsTable.uploaderId, usersTable.id))
      .where(eq(reelsTable.status, "approved"))
      .orderBy(desc(reelsTable.createdAt));
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: "فشل جلب الريلز" });
  }
});

// ── Upload reel (video file) ─────────────────────────────────────────────────
router.post("/reels/upload", authMiddleware, videoUpload.single("video"), async (req: AuthRequest, res): Promise<void> => {
  try {
    const role = req.user?.role;
    if (role !== "admin" && role !== "dealer") {
      res.status(403).json({ error: "غير مصرح لك برفع الفيديو" });
      return;
    }
    if (!req.file) { res.status(400).json({ error: "لم يتم رفع أي فيديو" }); return; }

    const videoUrl = `/api/uploads/reels/${req.file.filename}`;
    const { title, desc, price, city, dealerName, dealerId } = req.body;

    if (!title?.trim()) { res.status(400).json({ error: "العنوان مطلوب" }); return; }

    const status = role === "admin" ? "approved" : "pending";
    const [reel] = await db.insert(reelsTable).values({
      uploaderId: req.user!.userId,
      videoUrl,
      thumbnailUrl: null,
      title: title.trim(),
      desc: desc?.trim() || null,
      price: price?.trim() || null,
      city: city?.trim() || null,
      dealerName: dealerName?.trim() || null,
      dealerId: dealerId ? parseInt(dealerId) : (req.user!.userId ?? null),
      sponsored: "false",
      status,
    }).returning();

    res.json({ ...reel, status });
  } catch (e: any) {
    res.status(500).json({ error: e.message || "فشل رفع الفيديو" });
  }
});

// ── Upload thumbnail for a reel ──────────────────────────────────────────────
router.post("/reels/:id/thumbnail", authMiddleware, thumbUpload.single("thumbnail"), async (req: AuthRequest, res): Promise<void> => {
  try {
    const reelId = parseInt(req.params.id);
    if (!req.file) { res.status(400).json({ error: "لم يتم رفع أي صورة" }); return; }
    const thumbnailUrl = `/api/uploads/reels-thumbs/${req.file.filename}`;
    await db.update(reelsTable).set({ thumbnailUrl }).where(eq(reelsTable.id, reelId));
    res.json({ thumbnailUrl });
  } catch (e) {
    res.status(500).json({ error: "فشل رفع الصورة المصغرة" });
  }
});

// ── Track view ───────────────────────────────────────────────────────────────
router.post("/reels/:id/view", async (req, res): Promise<void> => {
  try {
    const id = parseInt(req.params.id);
    await db.update(reelsTable)
      .set({ views: (await db.select({ v: reelsTable.views }).from(reelsTable).where(eq(reelsTable.id, id)))[0]?.v + 1 || 1 })
      .where(eq(reelsTable.id, id));
    res.json({ ok: true });
  } catch { res.json({ ok: false }); }
});

// ── Admin: list all reels ────────────────────────────────────────────────────
router.get("/admin/reels", authMiddleware, async (req: AuthRequest, res): Promise<void> => {
  if (req.user?.role !== "admin") { res.status(403).json({ error: "ممنوع" }); return; }
  try {
    const rows = await db.select().from(reelsTable).orderBy(desc(reelsTable.createdAt));
    res.json(rows);
  } catch { res.status(500).json({ error: "خطأ" }); }
});

// ── Admin: list pending reels ────────────────────────────────────────────────
router.get("/admin/reels/pending", authMiddleware, async (req: AuthRequest, res): Promise<void> => {
  if (req.user?.role !== "admin") { res.status(403).json({ error: "ممنوع" }); return; }
  try {
    const rows = await db.select().from(reelsTable).where(eq(reelsTable.status, "pending")).orderBy(desc(reelsTable.createdAt));
    res.json(rows);
  } catch { res.status(500).json({ error: "خطأ" }); }
});

// ── Admin: approve ───────────────────────────────────────────────────────────
router.patch("/admin/reels/:id/approve", authMiddleware, async (req: AuthRequest, res): Promise<void> => {
  if (req.user?.role !== "admin") { res.status(403).json({ error: "ممنوع" }); return; }
  try {
    await db.update(reelsTable).set({ status: "approved" }).where(eq(reelsTable.id, parseInt(req.params.id)));
    res.json({ ok: true });
  } catch { res.status(500).json({ error: "خطأ" }); }
});

// ── Admin: reject ─────────────────────────────────────────────────────────────
router.patch("/admin/reels/:id/reject", authMiddleware, async (req: AuthRequest, res): Promise<void> => {
  if (req.user?.role !== "admin") { res.status(403).json({ error: "ممنوع" }); return; }
  try {
    await db.update(reelsTable).set({ status: "rejected" }).where(eq(reelsTable.id, parseInt(req.params.id)));
    res.json({ ok: true });
  } catch { res.status(500).json({ error: "خطأ" }); }
});

// ── Admin: delete ─────────────────────────────────────────────────────────────
router.delete("/admin/reels/:id", authMiddleware, async (req: AuthRequest, res): Promise<void> => {
  if (req.user?.role !== "admin") { res.status(403).json({ error: "ممنوع" }); return; }
  try {
    const [reel] = await db.select().from(reelsTable).where(eq(reelsTable.id, parseInt(req.params.id)));
    if (reel) {
      // delete video file
      const filePath = path.join(process.cwd(), reel.videoUrl.replace("/api/", ""));
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      if (reel.thumbnailUrl) {
        const thumbPath = path.join(process.cwd(), reel.thumbnailUrl.replace("/api/", ""));
        if (fs.existsSync(thumbPath)) fs.unlinkSync(thumbPath);
      }
    }
    await db.delete(reelsTable).where(eq(reelsTable.id, parseInt(req.params.id)));
    res.json({ ok: true });
  } catch { res.status(500).json({ error: "خطأ" }); }
});

export default router;
