import { Router, type IRouter } from "express";
import { db, usersTable } from "@workspace/db";
import { eq, or } from "drizzle-orm";
import { RegisterBody, LoginBody } from "@workspace/api-zod";
import bcrypt from "bcryptjs";
import { comparePasswords, generateToken, authMiddleware, type AuthRequest } from "../lib/auth.js";

const router: IRouter = Router();

function serializeUser(user: typeof usersTable.$inferSelect) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    role: user.role,
    profilePhoto: user.profilePhoto,
    province: user.province,
    city: user.city,
    isVerified: user.isVerified,
    isPremium: user.isPremium,
    isFeaturedSeller: user.isFeaturedSeller,
    subscriptionActive: user.subscriptionActive,
    createdAt: user.createdAt,
  };
}

router.post("/auth/register", async (req, res): Promise<void> => {
  const parsed = RegisterBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { name, email, phone, password, role } = parsed.data;

  if (!email && !phone) {
    res.status(400).json({ error: "يجب توفير البريد الإلكتروني أو رقم الهاتف" });
    return;
  }

  const existingConditions = [];
  if (email) existingConditions.push(eq(usersTable.email, email));
  if (phone) existingConditions.push(eq(usersTable.phone, phone));

  const existing = await db.select().from(usersTable).where(or(...existingConditions)).limit(1);
  if (existing.length > 0) {
    res.status(400).json({ error: "المستخدم موجود بالفعل" });
    return;
  }

  const hash = await bcrypt.hash(password, 10);
  const [user] = await db.insert(usersTable).values({
    name,
    email: email ?? null,
    phone: phone ?? null,
    password: hash,
    role: role ?? "buyer",
  }).returning();

  const token = generateToken(user.id, user.role);
  res.status(201).json({ token, user: serializeUser(user) });
});

router.post("/auth/login", async (req, res): Promise<void> => {
  const parsed = LoginBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { identifier, password } = parsed.data;

  const [user] = await db.select().from(usersTable).where(
    or(eq(usersTable.email, identifier), eq(usersTable.phone, identifier))
  ).limit(1);

  if (!user) {
    res.status(401).json({ error: "بيانات الدخول غير صحيحة" });
    return;
  }

  if (user.isBanned) {
    res.status(403).json({ error: "تم حظر هذا الحساب" });
    return;
  }

  if (!comparePasswords(password, user.password)) {
    res.status(401).json({ error: "بيانات الدخول غير صحيحة" });
    return;
  }

  const token = generateToken(user.id, user.role);
  res.json({ token, user: serializeUser(user) });
});

router.get("/auth/me", authMiddleware, async (req: AuthRequest, res): Promise<void> => {
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.userId!)).limit(1);
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  res.json(serializeUser(user));
});

// Short-path aliases
router.post("/register", async (req, res): Promise<void> => {
  const parsed = RegisterBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { name, email, phone, password, role } = parsed.data;

  if (!email && !phone) {
    res.status(400).json({ error: "يجب توفير البريد الإلكتروني أو رقم الهاتف" });
    return;
  }

  const existingConditions = [];
  if (email) existingConditions.push(eq(usersTable.email, email));
  if (phone) existingConditions.push(eq(usersTable.phone, phone));

  const existing = await db.select().from(usersTable).where(or(...existingConditions)).limit(1);
  if (existing.length > 0) {
    res.status(400).json({ error: "المستخدم موجود بالفعل" });
    return;
  }

  const hash = await bcrypt.hash(password, 10);
  const [user] = await db.insert(usersTable).values({
    name,
    email: email ?? null,
    phone: phone ?? null,
    password: hash,
    role: role ?? "buyer",
  }).returning();

  const token = generateToken(user.id, user.role);
  res.status(201).json({ token, user: serializeUser(user) });
});

router.post("/login", async (req, res): Promise<void> => {
  const parsed = LoginBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { identifier, password } = parsed.data;

  const [user] = await db.select().from(usersTable).where(
    or(eq(usersTable.email, identifier), eq(usersTable.phone, identifier))
  ).limit(1);

  if (!user) {
    res.status(401).json({ error: "بيانات الدخول غير صحيحة" });
    return;
  }

  if (user.isBanned) {
    res.status(403).json({ error: "تم حظر هذا الحساب" });
    return;
  }

  if (!comparePasswords(password, user.password)) {
    res.status(401).json({ error: "بيانات الدخول غير صحيحة" });
    return;
  }

  const token = generateToken(user.id, user.role);
  res.json({ token, user: serializeUser(user) });
});

router.get("/profile", authMiddleware, async (req: AuthRequest, res): Promise<void> => {
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.userId!)).limit(1);
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  res.json(serializeUser(user));
});

export default router;
