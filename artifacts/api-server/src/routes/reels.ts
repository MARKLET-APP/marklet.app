import { Router, type IRouter } from "express";
import { db, reelsTable, usersTable, showroomsTable, notificationsTable } from "@workspace/db";
import { eq, desc, sql, and } from "drizzle-orm";
import { sendPushToUser } from "../services/pushService.js";
import multer from "multer";
import path from "path";
import fs from "fs";
import { authMiddleware, optionalAuthMiddleware as optionalAuth, type AuthRequest } from "../lib/auth.js";
import { uploadFileStreamToGCS, uploadBufferToGCS } from "../lib/gcsUpload.js";

const router: IRouter = Router();

// ── Video upload storage — disk then stream to GCS ──────────────────────────
const reelsTmpDir = path.join(process.cwd(), "uploads", "reels-tmp");
if (!fs.existsSync(reelsTmpDir)) fs.mkdirSync(reelsTmpDir, { recursive: true });

const videoStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, reelsTmpDir),
  filename: (_req, _file, cb) => cb(null, `${Date.now()}_${Math.random().toString(36).slice(2)}.mp4`),
});

const videoUpload = multer({
  storage: videoStorage,
  limits: { fileSize: 150 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (/video\//.test(file.mimetype)) cb(null, true);
    else cb(new Error("يجب أن يكون الملف فيديو"));
  },
});

const thumbUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (/image\//.test(file.mimetype)) cb(null, true);
    else cb(new Error("يجب أن تكون صورة"));
  },
});

// ── Public: list approved reels ─────────────────────────────────────────────
router.get("/reels", optionalAuth, async (req, res): Promise<void> => {
  try {
    const aspectRatio = req.query.aspectRatio as string | undefined;
    const whereConditions = [eq(reelsTable.status, "approved")];
    if (aspectRatio) whereConditions.push(eq(reelsTable.aspectRatio, aspectRatio));
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
        aspectRatio: reelsTable.aspectRatio,
        views: reelsTable.views,
        likes: reelsTable.likes,
        status: reelsTable.status,
        createdAt: reelsTable.createdAt,
        uploaderName: usersTable.name,
        // owner user ID of the showroom (for messaging)
        showroomOwnerId: showroomsTable.ownerUserId,
      })
      .from(reelsTable)
      .leftJoin(usersTable, eq(reelsTable.uploaderId, usersTable.id))
      .leftJoin(showroomsTable, eq(reelsTable.dealerId, showroomsTable.id))
      .where(and(...whereConditions))
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

    const videoUrl = await uploadFileStreamToGCS(req.file.path, "reels", req.file.mimetype || "video/mp4");
    try { fs.unlinkSync(req.file.path); } catch {}
    const { title, desc, price, city, dealerName, dealerId, aspectRatio } = req.body;

    if (!title?.trim()) { res.status(400).json({ error: "العنوان مطلوب" }); return; }

    const uid = req.user!.id;
    const status = role === "admin" ? "approved" : "pending";
    const ratio = aspectRatio === "square" ? "square" : "reel";
    const [reel] = await db.insert(reelsTable).values({
      uploaderId: uid,
      videoUrl,
      thumbnailUrl: null,
      title: title.trim(),
      desc: desc?.trim() || null,
      price: price?.trim() || null,
      city: city?.trim() || null,
      dealerName: dealerName?.trim() || null,
      dealerId: dealerId ? parseInt(dealerId) : null,
      sponsored: ratio === "square" ? "true" : "false",
      aspectRatio: ratio,
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
    const thumbnailUrl = await uploadBufferToGCS(req.file.buffer, "reels-thumbs", "jpg", req.file.mimetype || "image/jpeg");
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
      .set({ views: sql`${reelsTable.views} + 1` })
      .where(eq(reelsTable.id, id));
    res.json({ ok: true });
  } catch { res.json({ ok: false }); }
});

// ── Like / Unlike reel ────────────────────────────────────────────────────────
router.post("/reels/:id/like", optionalAuth, async (req, res): Promise<void> => {
  try {
    const id = parseInt(req.params.id);
    const action = (req.body?.action as string) || "like";
    await db.update(reelsTable)
      .set({ likes: sql`${reelsTable.likes} + ${action === "unlike" ? -1 : 1}` })
      .where(eq(reelsTable.id, id));
    const [row] = await db.select({ likes: reelsTable.likes }).from(reelsTable).where(eq(reelsTable.id, id));
    res.json({ ok: true, likes: row?.likes ?? 0 });
  } catch { res.json({ ok: false, likes: 0 }); }
});

// ── Get admin contact ID ───────────────────────────────────────────────────────
router.get("/system/admin-id", async (_req, res): Promise<void> => {
  try {
    const [admin] = await db.select({ id: usersTable.id })
      .from(usersTable)
      .where(eq(usersTable.role, "admin"))
      .limit(1);
    res.json({ adminId: admin?.id ?? null });
  } catch { res.json({ adminId: null }); }
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
    const id = parseInt(req.params.id);
    const [reel] = await db.select({ dealerId: reelsTable.dealerId, title: reelsTable.title }).from(reelsTable).where(eq(reelsTable.id, id));
    await db.update(reelsTable).set({ status: "approved" }).where(eq(reelsTable.id, id));
    if (reel?.dealerId) {
      const msg = `تمت الموافقة على فيديوك "${reel.title || "ريل"}" ونشره على LAZEMNI`;
      await db.insert(notificationsTable).values({ userId: reel.dealerId, type: "approval", message: msg, link: "/reels" }).catch(() => {});
      sendPushToUser(reel.dealerId, { title: "✅ تمت الموافقة على فيديوك", body: msg, url: "/reels", tag: `reel-approved-${id}` }).catch(() => {});
    }
    res.json({ ok: true });
  } catch { res.status(500).json({ error: "خطأ" }); }
});

// ── Admin: reject ─────────────────────────────────────────────────────────────
router.patch("/admin/reels/:id/reject", authMiddleware, async (req: AuthRequest, res): Promise<void> => {
  if (req.user?.role !== "admin") { res.status(403).json({ error: "ممنوع" }); return; }
  try {
    const id = parseInt(req.params.id);
    const [reel] = await db.select({ dealerId: reelsTable.dealerId, title: reelsTable.title }).from(reelsTable).where(eq(reelsTable.id, id));
    await db.update(reelsTable).set({ status: "rejected" }).where(eq(reelsTable.id, id));
    if (reel?.dealerId) {
      const msg = `تم رفض فيديوك "${reel.title || "ريل"}". يمكنك تعديله وإعادة إرساله`;
      await db.insert(notificationsTable).values({ userId: reel.dealerId, type: "rejection", message: msg }).catch(() => {});
      sendPushToUser(reel.dealerId, { title: "❌ تم رفض فيديوك", body: msg, tag: `reel-rejected-${id}` }).catch(() => {});
    }
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
