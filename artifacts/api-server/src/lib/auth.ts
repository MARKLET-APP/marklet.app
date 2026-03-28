import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { Request, Response, NextFunction } from "express";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const JWT_SECRET = process.env.JWT_SECRET || "syrian-car-market-secret-key-2024";

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export function comparePasswords(password: string, hash: string): boolean {
  return bcrypt.compareSync(password, hash);
}

export function generateToken(userId: number, role: string): string {
  return jwt.sign({ userId, role }, JWT_SECRET, { expiresIn: "30d" });
}

export function verifyToken(token: string): { userId: number; role: string } | null {
  try {
    return jwt.verify(token, JWT_SECRET) as { userId: number; role: string };
  } catch {
    return null;
  }
}

export interface AuthRequest extends Request {
  userId?: number;
  userRole?: string;
  user?: { id: number; role: string };
}

// Track last active — fire-and-forget (never blocks the request)
function trackLastActive(userId: number): void {
  setImmediate(() => {
    db.update(usersTable)
      .set({ lastActiveAt: new Date() })
      .where(eq(usersTable.id, userId))
      .catch(() => {/* silent */});
  });
}

export function authMiddleware(req: AuthRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).send("Unauthorized");
    return;
  }
  const token = authHeader.slice(7);
  const payload = verifyToken(token);
  if (!payload) {
    res.status(401).send("Unauthorized");
    return;
  }
  req.userId = payload.userId;
  req.userRole = payload.role;
  req.user = { id: payload.userId, role: payload.role };
  trackLastActive(payload.userId);
  next();
}

export function adminMiddleware(req: AuthRequest, res: Response, next: NextFunction): void {
  if (!req.user) {
    res.status(401).send("Unauthorized");
    return;
  }
  if (req.user.role !== "admin") {
    res.status(403).send("Admin access required");
    return;
  }
  next();
}

export function optionalAuthMiddleware(req: AuthRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.slice(7);
    const payload = verifyToken(token);
    if (payload) {
      req.userId = payload.userId;
      req.userRole = payload.role;
      req.user = { id: payload.userId, role: payload.role };
    }
  }
  next();
}

export function inspectorMiddleware(req: AuthRequest, res: Response, next: NextFunction): void {
  if (!req.user) {
    res.status(401).send("Unauthorized");
    return;
  }
  if (req.user.role !== "inspector" && req.user.role !== "admin") {
    res.status(403).send("Inspector or admin access required");
    return;
  }
  next();
}
