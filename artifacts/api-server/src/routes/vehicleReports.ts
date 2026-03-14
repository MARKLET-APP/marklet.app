import { Router, type IRouter } from "express";
import { db, vehicleReportsTable } from "@workspace/db";
import { eq, or } from "drizzle-orm";
import { LookupVehicleBody } from "@workspace/api-zod";
import { generateVehicleAISummary } from "../lib/openai.js";

const router: IRouter = Router();

// ── WMI (first 3 chars of VIN) → brand + country of origin ────────────────
const WMI_MAP: Record<string, { brand: string; origin: string }> = {
  // Toyota
  JT2: { brand: "Toyota",        origin: "اليابان" },
  JT3: { brand: "Toyota",        origin: "اليابان" },
  JT4: { brand: "Toyota",        origin: "اليابان" },
  JTD: { brand: "Toyota",        origin: "اليابان" },
  JTE: { brand: "Toyota",        origin: "اليابان" },
  JTH: { brand: "Toyota",        origin: "اليابان" },
  JTJ: { brand: "Toyota",        origin: "اليابان" },
  JTK: { brand: "Toyota",        origin: "اليابان" },
  JTL: { brand: "Toyota",        origin: "اليابان" },
  JTM: { brand: "Toyota",        origin: "اليابان" },
  JTN: { brand: "Toyota",        origin: "اليابان" },
  // Hyundai
  KMH: { brand: "Hyundai",       origin: "كوريا الجنوبية" },
  KMF: { brand: "Hyundai",       origin: "كوريا الجنوبية" },
  // Kia
  KNA: { brand: "Kia",           origin: "كوريا الجنوبية" },
  KNB: { brand: "Kia",           origin: "كوريا الجنوبية" },
  KND: { brand: "Kia",           origin: "كوريا الجنوبية" },
  // Nissan
  JN1: { brand: "Nissan",        origin: "اليابان" },
  JN3: { brand: "Nissan",        origin: "اليابان" },
  JN8: { brand: "Nissan",        origin: "اليابان" },
  // Honda
  JH4: { brand: "Honda",         origin: "اليابان" },
  JHM: { brand: "Honda",         origin: "اليابان" },
  "1HG": { brand: "Honda",       origin: "الولايات المتحدة" },
  "2HG": { brand: "Honda",       origin: "كندا" },
  // Mitsubishi
  JA3: { brand: "Mitsubishi",    origin: "اليابان" },
  JA4: { brand: "Mitsubishi",    origin: "اليابان" },
  JMB: { brand: "Mitsubishi",    origin: "اليابان" },
  // BMW
  WBA: { brand: "BMW",           origin: "ألمانيا" },
  WBS: { brand: "BMW",           origin: "ألمانيا" },
  WBX: { brand: "BMW",           origin: "ألمانيا" },
  // Mercedes-Benz
  WDB: { brand: "Mercedes-Benz", origin: "ألمانيا" },
  WDD: { brand: "Mercedes-Benz", origin: "ألمانيا" },
  WDC: { brand: "Mercedes-Benz", origin: "ألمانيا" },
  // Volkswagen
  WVW: { brand: "Volkswagen",    origin: "ألمانيا" },
  WV2: { brand: "Volkswagen",    origin: "ألمانيا" },
  WV3: { brand: "Volkswagen",    origin: "ألمانيا" },
  // Audi
  WAU: { brand: "Audi",          origin: "ألمانيا" },
  TRU: { brand: "Audi",          origin: "هنغاريا" },
  // Ford
  "1FA": { brand: "Ford",        origin: "الولايات المتحدة" },
  "1FM": { brand: "Ford",        origin: "الولايات المتحدة" },
  "1FT": { brand: "Ford",        origin: "الولايات المتحدة" },
  // Chevrolet
  "1G1": { brand: "Chevrolet",   origin: "الولايات المتحدة" },
  "1GC": { brand: "Chevrolet",   origin: "الولايات المتحدة" },
  // Peugeot
  VF3: { brand: "Peugeot",       origin: "فرنسا" },
  VF7: { brand: "Citroën",       origin: "فرنسا" },
  // Renault
  VF1: { brand: "Renault",       origin: "فرنسا" },
  // Mazda
  JM1: { brand: "Mazda",         origin: "اليابان" },
  JM3: { brand: "Mazda",         origin: "اليابان" },
  // Volvo
  YV1: { brand: "Volvo",         origin: "السويد" },
  // Suzuki
  JSA: { brand: "Suzuki",        origin: "اليابان" },
  JS1: { brand: "Suzuki",        origin: "اليابان" },
  // Subaru
  JF1: { brand: "Subaru",        origin: "اليابان" },
  JF2: { brand: "Subaru",        origin: "اليابان" },
};

// ── Models per brand ────────────────────────────────────────────────────────
const MODEL_MAP: Record<string, string[]> = {
  Toyota:        ["Corolla", "Camry", "Yaris", "RAV4", "Hilux", "Prado", "Fortuner", "Highlander", "Land Cruiser"],
  Hyundai:       ["Elantra", "Sonata", "Tucson", "Santa Fe", "Accent", "i20", "Creta"],
  Kia:           ["Sportage", "Optima", "Cerato", "Picanto", "Soul", "Sorento", "Carnival"],
  Nissan:        ["Sunny", "Altima", "Maxima", "Patrol", "X-Trail", "Sentra", "Murano", "Juke"],
  Honda:         ["Civic", "Accord", "CR-V", "HR-V", "Fit", "Jazz", "Odyssey"],
  Mitsubishi:    ["Lancer", "Galant", "Outlander", "Pajero", "Eclipse", "ASX", "L200"],
  BMW:           ["316i", "318i", "320i", "328i", "520i", "530i", "X3", "X5"],
  "Mercedes-Benz": ["C180", "C200", "C220", "E200", "E220", "E250", "GLC", "GLE"],
  Volkswagen:    ["Passat", "Golf", "Jetta", "Tiguan", "Polo", "Touareg"],
  Audi:          ["A3", "A4", "A5", "A6", "Q3", "Q5", "Q7"],
  Ford:          ["Focus", "Fusion", "Explorer", "Escape", "F-150", "Edge"],
  Chevrolet:     ["Malibu", "Impala", "Cruze", "Spark", "Tahoe", "Equinox"],
  Peugeot:       ["206", "207", "301", "307", "308", "3008", "508"],
  "Citroën":     ["C3", "C4", "C5", "C-Elysée", "Berlingo"],
  Renault:       ["Logan", "Sandero", "Duster", "Megane", "Captur", "Laguna"],
  Mazda:         ["Mazda3", "Mazda6", "CX-5", "CX-3", "MX-5"],
  Volvo:         ["S40", "S60", "S80", "XC60", "XC90", "V40"],
  Suzuki:        ["Swift", "Vitara", "Grand Vitara", "Jimny", "Ertiga"],
  Subaru:        ["Impreza", "Legacy", "Outback", "Forester", "XV"],
};

// ── VIN character 10 → model year ──────────────────────────────────────────
const YEAR_MAP: Record<string, number> = {
  A: 2010, B: 2011, C: 2012, D: 2013, E: 2014, F: 2015, G: 2016,
  H: 2017, J: 2018, K: 2019, L: 2020, M: 2021, N: 2022, P: 2023,
  R: 2024, S: 2025,
  "1": 2001, "2": 2002, "3": 2003, "4": 2004, "5": 2005,
  "6": 2006, "7": 2007, "8": 2008, "9": 2009,
  Y: 2000, X: 1999, W: 1998, V: 1997, T: 1996,
};

// ── Deterministic seeded RNG from VIN string ────────────────────────────────
function makeRng(seed: string) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(31, h) + seed.charCodeAt(i) | 0;
  }
  return () => {
    h = Math.imul(h ^ (h >>> 16), 0x45d9f3b);
    h = Math.imul(h ^ (h >>> 16), 0x45d9f3b);
    h ^= h >>> 16;
    return (h >>> 0) / 0xffffffff;
  };
}

function pickOne<T>(arr: T[], rng: () => number): T {
  return arr[Math.floor(rng() * arr.length)];
}

// ── Decode VIN into vehicle profile ────────────────────────────────────────
function decodeVin(vin: string) {
  const rng = makeRng(vin);

  // Brand from WMI (chars 0-2)
  const wmi = vin.slice(0, 3).toUpperCase();
  const wmiEntry = WMI_MAP[wmi];
  const fallbackBrands = Object.values(WMI_MAP);
  const { brand, origin } = wmiEntry ?? pickOne(fallbackBrands, rng);

  // Model from brand list
  const models = MODEL_MAP[brand] ?? MODEL_MAP["Toyota"];
  const model = pickOne(models, rng);

  // Year from char 10 (index 9)
  const yearChar = vin[9]?.toUpperCase() ?? "";
  const year = YEAR_MAP[yearChar] ?? Math.floor(rng() * 14 + 2010); // 2010-2023 fallback

  // Engine capacity (varies by brand tier)
  const luxuryBrands = ["BMW", "Mercedes-Benz", "Audi", "Volvo"];
  const engineOptions = luxuryBrands.includes(brand)
    ? ["2.0L", "2.5L", "3.0L", "4.0L"]
    : ["1.2L", "1.4L", "1.5L", "1.6L", "1.8L", "2.0L"];
  const engineCapacity = pickOne(engineOptions, rng);

  // Horsepower
  const engineCC = parseInt(engineCapacity) * 1000;
  const baseHP = Math.round(engineCC * 0.06 + rng() * 40);
  const horsepower = Math.max(80, Math.min(400, baseHP));

  // Transmission
  const transmission = rng() > 0.4 ? "automatic" : "manual";

  // Fuel type
  const fuelType = rng() > 0.15 ? "petrol" : "diesel";

  // Ownership count
  const ownershipCount = Math.floor(rng() * 3) + 1;

  // Condition flags (seeded, not truly random per call)
  const isClean     = rng() > 0.3;
  const hasAccident = !isClean && rng() > 0.5;
  const hasStructural = !isClean && rng() > 0.7;

  let damageStatus = "clean";
  if (hasStructural) damageStatus = "serious";
  else if (hasAccident) damageStatus = "minor";

  // Mileage history (realistic based on year)
  const currentYear = new Date().getFullYear();
  const age = currentYear - year;
  const avgKmPerYear = 15000 + Math.floor(rng() * 10000);
  const mileageHistory: { year: number; mileage: number }[] = [];
  const checkYears = Math.min(age, 5);
  for (let i = checkYears; i > 0; i--) {
    const histYear = currentYear - i;
    if (histYear >= year) {
      mileageHistory.push({
        year: histYear,
        mileage: Math.round(avgKmPerYear * (checkYears - i + 1) * (0.85 + rng() * 0.3)),
      });
    }
  }

  return {
    brand, model, year, origin, engineCapacity, horsepower, transmission,
    fuelType, ownershipCount, isClean, hasAccident, hasStructural, damageStatus,
    mileageHistory,
  };
}

// ── Route ───────────────────────────────────────────────────────────────────
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
  if (vin)           conditions.push(eq(vehicleReportsTable.vin, vin));
  if (plateNumber)   conditions.push(eq(vehicleReportsTable.plateNumber, plateNumber));
  if (chassisNumber) conditions.push(eq(vehicleReportsTable.chassisNumber, chassisNumber));

  let [report] = await db.select().from(vehicleReportsTable)
    .where(or(...conditions))
    .limit(1);

  if (!report) {
    // Decode dynamic vehicle profile from VIN
    const key = vin ?? plateNumber ?? chassisNumber ?? "UNKNOWN";
    const v = decodeVin(key);

    const aiSummary = await generateVehicleAISummary({
      brand:               v.brand,
      model:               v.model,
      year:                v.year,
      accidentCount:       v.hasAccident ? 1 : 0,
      hasMajorRepairs:     v.hasAccident,
      hasStructuralDamage: v.hasStructural,
      airbagDeployed:      v.hasStructural,
      ownershipCount:      v.ownershipCount,
      mileageHistory:      v.mileageHistory,
    }).catch(() => null);

    const [inserted] = await db.insert(vehicleReportsTable).values({
      vin:              vin ?? null,
      plateNumber:      plateNumber ?? null,
      chassisNumber:    chassisNumber ?? null,
      brand:            v.brand,
      model:            v.model,
      year:             v.year,
      countryOfOrigin:  v.origin,
      engineSize:       `${Math.round(parseFloat(v.engineCapacity) * 1000)}cc`,
      fuelType:         v.fuelType,
      transmission:     v.transmission,
      engineCapacity:   v.engineCapacity,
      horsepower:       v.horsepower,
      fuelConsumption:  `${(7 + Math.random() * 4).toFixed(1)}L/100km`,
      driveType:        "FWD",
      accidentCount:    v.hasAccident ? 1 : 0,
      hasMajorRepairs:  v.hasAccident,
      hasStructuralDamage: v.hasStructural,
      airbagDeployed:   v.hasStructural,
      mileageHistory:   v.mileageHistory,
      ownershipCount:   v.ownershipCount,
      registrationRegion: "دمشق",
      damageStatus:     v.damageStatus,
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
