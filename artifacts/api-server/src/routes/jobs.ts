import { Router, type IRouter } from "express";
import { db, jobsTable, usersTable } from "@workspace/db";
import { eq, desc, ilike, or, and, sql } from "drizzle-orm";
import { authMiddleware, type AuthRequest } from "../lib/auth.js";
import { generateJobDescription } from "../lib/openai.js";

const router: IRouter = Router();

/* GET all active jobs (public) */
router.get("/jobs", async (req: any, res): Promise<void> => {
  try {
    const { q, subCategory, field, province, jobType, limit = "20", offset = "0" } = req.query as Record<string, string>;

    const filters: any[] = [eq(jobsTable.isActive, true), eq(jobsTable.status, "active")];
    if (subCategory) filters.push(eq(jobsTable.subCategory, subCategory));
    if (field) filters.push(eq(jobsTable.field, field));
    if (province) filters.push(eq(jobsTable.province, province));
    if (jobType) filters.push(eq(jobsTable.jobType, jobType));
    if (q) filters.push(or(ilike(jobsTable.title, `%${q}%`), ilike(jobsTable.company, `%${q}%`), ilike(jobsTable.description, `%${q}%`)));

    const rows = await db
      .select({
        id: jobsTable.id,
        title: jobsTable.title,
        subCategory: jobsTable.subCategory,
        company: jobsTable.company,
        salary: jobsTable.salary,
        jobType: jobsTable.jobType,
        experience: jobsTable.experience,
        field: jobsTable.field,
        province: jobsTable.province,
        city: jobsTable.city,
        isFeatured: jobsTable.isFeatured,
        viewCount: jobsTable.viewCount,
        createdAt: jobsTable.createdAt,
        posterName: usersTable.name,
        posterId: jobsTable.posterId,
      })
      .from(jobsTable)
      .leftJoin(usersTable, eq(jobsTable.posterId, usersTable.id))
      .where(and(...filters))
      .orderBy(desc(jobsTable.isFeatured), desc(jobsTable.createdAt))
      .limit(Number(limit))
      .offset(Number(offset));

    res.json(rows);
  } catch (err) {
    console.error("GET /jobs error:", err);
    res.status(500).json({ error: "فشل تحميل الوظائف" });
  }
});

/* GET single job */
router.get("/jobs/:id", async (req: any, res): Promise<void> => {
  try {
    const id = Number(req.params.id);
    const [row] = await db
      .select({
        id: jobsTable.id,
        posterId: jobsTable.posterId,
        title: jobsTable.title,
        subCategory: jobsTable.subCategory,
        company: jobsTable.company,
        salary: jobsTable.salary,
        jobType: jobsTable.jobType,
        experience: jobsTable.experience,
        field: jobsTable.field,
        province: jobsTable.province,
        city: jobsTable.city,
        phone: jobsTable.phone,
        description: jobsTable.description,
        requirements: jobsTable.requirements,
        isFeatured: jobsTable.isFeatured,
        viewCount: jobsTable.viewCount,
        createdAt: jobsTable.createdAt,
        posterName: usersTable.name,
        posterPhone: usersTable.phone,
      })
      .from(jobsTable)
      .leftJoin(usersTable, eq(jobsTable.posterId, usersTable.id))
      .where(eq(jobsTable.id, id));

    if (!row) { res.status(404).json({ error: "الوظيفة غير موجودة" }); return; }
    await db.update(jobsTable).set({ viewCount: sql`${jobsTable.viewCount} + 1` }).where(eq(jobsTable.id, id));
    res.json(row);
  } catch (err) {
    res.status(500).json({ error: "فشل تحميل الوظيفة" });
  }
});

/* POST create job listing (auth required) */
router.post("/jobs", authMiddleware, async (req: AuthRequest, res): Promise<void> => {
  try {
    const userId = req.user!.id;
    const { title, subCategory, company, salary, salaryCurrency, jobType, experience, field, province, city, phone, description, requirements, cvUrl } = req.body;

    if (!title || !subCategory || !province || !city) {
      res.status(400).json({ error: "يرجى تعبئة الحقول الإلزامية" });
      return;
    }

    const [created] = await db.insert(jobsTable).values({
      posterId: userId,
      title,
      subCategory,
      company: company || null,
      salary: salary || null,
      salaryCurrency: salaryCurrency || "USD",
      jobType: jobType || null,
      experience: experience || null,
      field: field || null,
      province,
      city,
      phone: phone || null,
      description: description || null,
      requirements: requirements || null,
      cvUrl: cvUrl || null,
      status: "pending",
    }).returning();

    res.status(201).json(created);
  } catch (err) {
    console.error("POST /jobs error:", err);
    res.status(500).json({ error: "فشل نشر الوظيفة" });
  }
});

/* POST generate AI description for jobs */
router.post("/jobs/ai-description", authMiddleware, async (req: AuthRequest, res): Promise<void> => {
  try {
    const description = await generateJobDescription(req.body);
    res.json({ description });
  } catch (err) {
    res.status(500).json({ error: "فشل توليد الوصف" });
  }
});

/* DELETE job (owner or admin) */
router.delete("/jobs/:id", authMiddleware, async (req: AuthRequest, res): Promise<void> => {
  try {
    const id = Number(req.params.id);
    const userId = req.user!.id;
    const isAdmin = req.user!.role === "admin";

    const [row] = await db.select({ posterId: jobsTable.posterId }).from(jobsTable).where(eq(jobsTable.id, id));
    if (!row) { res.status(404).json({ error: "الوظيفة غير موجودة" }); return; }
    if (!isAdmin && row.posterId !== userId) { res.status(403).json({ error: "غير مصرح" }); return; }

    await db.update(jobsTable).set({ isActive: false, status: "closed" }).where(eq(jobsTable.id, id));
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "فشل حذف الوظيفة" });
  }
});

export default router;
