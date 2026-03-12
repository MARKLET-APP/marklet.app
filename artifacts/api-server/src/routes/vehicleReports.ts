import { Router, type IRouter } from "express";
import { db, vehicleReportsTable } from "@workspace/db";
import { eq, or } from "drizzle-orm";
import { LookupVehicleBody } from "@workspace/api-zod";
import { generateVehicleAISummary } from "../lib/openai.js";

const router: IRouter = Router();

router.post("/vehicle-reports/lookup", async (req, res): Promise<void> => {
  const parsed = LookupVehicleBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { vin, plateNumber, chassisNumber } = parsed.data;
  
  if (!vin && !plateNumber && !chassisNumber) {
    res.status(400).json({ error: "يجب توفير رقم VIN أو رقم اللوحة أو رقم الهيكل" });
    return;
  }

  const conditions = [];
  if (vin) conditions.push(eq(vehicleReportsTable.vin, vin));
  if (plateNumber) conditions.push(eq(vehicleReportsTable.plateNumber, plateNumber));
  if (chassisNumber) conditions.push(eq(vehicleReportsTable.chassisNumber, chassisNumber));

  let [report] = await db.select().from(vehicleReportsTable)
    .where(or(...conditions))
    .limit(1);

  if (!report) {
    const mileageHistory = [
      { year: 2018, mileage: 25000 },
      { year: 2020, mileage: 55000 },
      { year: 2022, mileage: 85000 },
      { year: 2024, mileage: 115000 },
    ];

    const isClean = Math.random() > 0.3;
    const hasAccident = !isClean && Math.random() > 0.5;
    const hasStructural = !isClean && Math.random() > 0.7;

    let damageStatus = "clean";
    if (hasStructural) damageStatus = "serious";
    else if (hasAccident) damageStatus = "minor";

    const aiSummary = await generateVehicleAISummary({
      brand: "Toyota",
      model: "Corolla",
      year: 2018,
      accidentCount: hasAccident ? 1 : 0,
      hasMajorRepairs: hasAccident,
      hasStructuralDamage: hasStructural,
      airbagDeployed: hasStructural,
      ownershipCount: 2,
      mileageHistory,
    }).catch(() => null);

    const [inserted] = await db.insert(vehicleReportsTable).values({
      vin: vin ?? null,
      plateNumber: plateNumber ?? null,
      chassisNumber: chassisNumber ?? null,
      brand: "Toyota",
      model: "Corolla",
      year: 2018,
      countryOfOrigin: "اليابان",
      engineSize: "1600cc",
      fuelType: "petrol",
      transmission: "automatic",
      engineCapacity: "1.6L",
      horsepower: 132,
      fuelConsumption: "7.5L/100km",
      driveType: "FWD",
      accidentCount: hasAccident ? 1 : 0,
      hasMajorRepairs: hasAccident,
      hasStructuralDamage: hasStructural,
      airbagDeployed: hasStructural,
      mileageHistory,
      ownershipCount: 2,
      registrationRegion: "دمشق",
      damageStatus,
      aiSummary,
    }).returning();
    report = inserted;
  }

  res.json({
    ...report,
    mileageHistory: Array.isArray(report.mileageHistory) ? report.mileageHistory : [],
  });
});

export default router;
