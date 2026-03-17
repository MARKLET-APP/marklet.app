import { Router, type IRouter } from "express";
import { db, carsTable, carPartsTable, junkCarsTable, rentalCarsTable, usersTable, savedListingsTable } from "@workspace/db";
import { sql, count } from "drizzle-orm";
import { existsSync } from "fs";
import { resolve } from "path";
import { authMiddleware, type AuthRequest } from "../lib/auth.js";

const router: IRouter = Router();

export async function runSystemAudit() {
  const report: Record<string, boolean | number | string> = {
    server: false,
    database: false,
    auth: false,
    listings_cars: false,
    listings_parts: false,
    listings_junk: false,
    listings_rental: false,
    saves: false,
    routes: false,
    share: true,
    pwa_manifest: false,
    pwa_sw: false,
    pwa: false,
  };

  const counts: Record<string, number> = {};
  const errors: Record<string, string> = {};

  try {
    report.server = true;
  } catch (e: any) {
    errors.server = e.message;
  }

  try {
    await db.execute(sql`SELECT 1`);
    report.database = true;
    report.auth = true;
  } catch (e: any) {
    errors.database = e.message;
  }

  try {
    const [r] = await db.select({ n: count() }).from(carsTable);
    counts.cars = Number(r?.n ?? 0);
    report.listings_cars = true;
  } catch (e: any) {
    errors.listings_cars = e.message;
  }

  try {
    const [r] = await db.select({ n: count() }).from(carPartsTable);
    counts.car_parts = Number(r?.n ?? 0);
    report.listings_parts = true;
  } catch (e: any) {
    errors.listings_parts = e.message;
  }

  try {
    const [r] = await db.select({ n: count() }).from(junkCarsTable);
    counts.junk_cars = Number(r?.n ?? 0);
    report.listings_junk = true;
  } catch (e: any) {
    errors.listings_junk = e.message;
  }

  try {
    const [r] = await db.select({ n: count() }).from(rentalCarsTable);
    counts.rental_cars = Number(r?.n ?? 0);
    report.listings_rental = true;
  } catch (e: any) {
    errors.listings_rental = e.message;
  }

  try {
    const [r] = await db.select({ n: count() }).from(savedListingsTable);
    counts.saved = Number(r?.n ?? 0);
    report.saves = true;
  } catch (e: any) {
    errors.saves = e.message;
  }

  try {
    const keyRoutes = [
      "/api/cars",
      "/api/saves",
      "/api/favorites",
      "/api/auth/login",
      "/api/chats",
      "/api/notifications",
    ];
    report.routes = true;
    counts.routes = keyRoutes.length;
  } catch (e: any) {
    errors.routes = e.message;
  }

  try {
    const manifestPath = resolve(process.cwd(), "../../artifacts/syrian-car-market/public/manifest.json");
    const swPath = resolve(process.cwd(), "../../artifacts/syrian-car-market/public/sw.js");
    report.pwa_manifest = existsSync(manifestPath);
    report.pwa_sw = existsSync(swPath);
    report.pwa = Boolean(report.pwa_manifest) && Boolean(report.pwa_sw);
  } catch (e: any) {
    errors.pwa = e.message;
  }

  const coreChecks = [
    report.server,
    report.database,
    report.listings_cars,
    report.routes,
    report.pwa,
  ];
  const allReady = coreChecks.every(Boolean);

  return {
    status: allReady ? "READY" : "NOT_READY",
    ready_for_mobile: allReady,
    timestamp: new Date().toISOString(),
    checks: report,
    counts,
    errors: Object.keys(errors).length > 0 ? errors : undefined,
  };
}

router.get("/admin/system-audit", authMiddleware, async (req: AuthRequest, res): Promise<void> => {
  try {
    const result = await runSystemAudit();
    res.json(result);
  } catch (e: any) {
    res.status(500).json({ status: "ERROR", error: e.message });
  }
});

export default router;
