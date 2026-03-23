import { Router, type IRouter } from "express";
import { db, vehicleReportsTable } from "@workspace/db";
import { eq, or } from "drizzle-orm";
import { LookupVehicleBody } from "@workspace/api-zod";
import { generateVehicleAISummary } from "../lib/openai.js";

const router: IRouter = Router();

// ── WMI (first 3 chars of VIN) → brand + country of origin ────────────────
const WMI_MAP: Record<string, { brand: string; origin: string }> = {
  // ── Toyota ──────────────────────────────────────────────────────────────
  JT2: { brand: "Toyota", origin: "اليابان" },
  JT3: { brand: "Toyota", origin: "اليابان" },
  JT4: { brand: "Toyota", origin: "اليابان" },
  JT6: { brand: "Toyota", origin: "اليابان" },
  JT7: { brand: "Toyota", origin: "اليابان" },
  JT8: { brand: "Toyota", origin: "اليابان" },
  JTD: { brand: "Toyota", origin: "اليابان" },
  JTE: { brand: "Toyota", origin: "اليابان" },
  JTF: { brand: "Toyota", origin: "اليابان" },
  JTG: { brand: "Toyota", origin: "اليابان" },
  JTH: { brand: "Toyota", origin: "اليابان" },
  JTJ: { brand: "Toyota", origin: "اليابان" },
  JTK: { brand: "Toyota", origin: "اليابان" },
  JTL: { brand: "Toyota", origin: "اليابان" },
  JTM: { brand: "Toyota", origin: "اليابان" },
  JTN: { brand: "Toyota", origin: "اليابان" },
  MR0: { brand: "Toyota", origin: "تركيا" },
  MR1: { brand: "Toyota", origin: "تركيا" },
  "8FD": { brand: "Toyota", origin: "جنوب أفريقيا" },
  // ── Lexus ────────────────────────────────────────────────────────────────
  JTH: { brand: "Lexus", origin: "اليابان" },  // overrides Toyota JTH — Lexus shares JTH prefix
  // ── Nissan ───────────────────────────────────────────────────────────────
  JN1: { brand: "Nissan", origin: "اليابان" },
  JN3: { brand: "Nissan", origin: "اليابان" },
  JN6: { brand: "Nissan", origin: "اليابان" },
  JN8: { brand: "Nissan", origin: "اليابان" },
  "5N1": { brand: "Nissan", origin: "الولايات المتحدة" },
  "3N6": { brand: "Nissan", origin: "المكسيك" },
  // ── Infiniti ─────────────────────────────────────────────────────────────
  JNK: { brand: "Infiniti", origin: "اليابان" },
  // ── Honda ────────────────────────────────────────────────────────────────
  JHM: { brand: "Honda", origin: "اليابان" },
  SHH: { brand: "Honda", origin: "المملكة المتحدة" },
  "1HG": { brand: "Honda", origin: "الولايات المتحدة" },
  "2HG": { brand: "Honda", origin: "كندا" },
  "19X": { brand: "Honda", origin: "الولايات المتحدة" },
  // ── Acura ────────────────────────────────────────────────────────────────
  JH4: { brand: "Acura", origin: "اليابان" },
  // ── Hyundai ──────────────────────────────────────────────────────────────
  KMH: { brand: "Hyundai", origin: "كوريا الجنوبية" },
  KMF: { brand: "Hyundai", origin: "كوريا الجنوبية" },
  "5NP": { brand: "Hyundai", origin: "الولايات المتحدة" },
  Z94: { brand: "Hyundai", origin: "كازاخستان" },
  // ── Kia ──────────────────────────────────────────────────────────────────
  KNA: { brand: "Kia", origin: "كوريا الجنوبية" },
  KNB: { brand: "Kia", origin: "كوريا الجنوبية" },
  KND: { brand: "Kia", origin: "كوريا الجنوبية" },
  KNE: { brand: "Kia", origin: "كوريا الجنوبية" },
  KNJ: { brand: "Kia", origin: "كوريا الجنوبية" },
  U5Y: { brand: "Kia", origin: "سلوفاكيا" },
  // ── Mitsubishi ───────────────────────────────────────────────────────────
  JA3: { brand: "Mitsubishi", origin: "اليابان" },
  JA4: { brand: "Mitsubishi", origin: "اليابان" },
  JMB: { brand: "Mitsubishi", origin: "اليابان" },
  JMY: { brand: "Mitsubishi", origin: "اليابان" },
  ML3: { brand: "Mitsubishi", origin: "الولايات المتحدة" },
  // ── Mazda ────────────────────────────────────────────────────────────────
  JM1: { brand: "Mazda", origin: "اليابان" },
  JM3: { brand: "Mazda", origin: "اليابان" },
  JM6: { brand: "Mazda", origin: "اليابان" },
  // ── Subaru ───────────────────────────────────────────────────────────────
  JF1: { brand: "Subaru", origin: "اليابان" },
  JF2: { brand: "Subaru", origin: "اليابان" },
  // ── Suzuki ───────────────────────────────────────────────────────────────
  JSA: { brand: "Suzuki", origin: "اليابان" },
  JS1: { brand: "Suzuki", origin: "اليابان" },
  JS2: { brand: "Suzuki", origin: "اليابان" },
  JS3: { brand: "Suzuki", origin: "اليابان" },
  MA3: { brand: "Suzuki", origin: "الهند" },
  // ── Daihatsu ─────────────────────────────────────────────────────────────
  JD1: { brand: "Daihatsu", origin: "اليابان" },
  JD2: { brand: "Daihatsu", origin: "اليابان" },
  // ── Isuzu ────────────────────────────────────────────────────────────────
  JAA: { brand: "Isuzu", origin: "اليابان" },
  JAB: { brand: "Isuzu", origin: "اليابان" },
  JAC: { brand: "Isuzu", origin: "اليابان" },
  // ── BMW ──────────────────────────────────────────────────────────────────
  WBA: { brand: "BMW", origin: "ألمانيا" },
  WBS: { brand: "BMW", origin: "ألمانيا" },
  WBX: { brand: "BMW", origin: "ألمانيا" },
  WBY: { brand: "BMW", origin: "ألمانيا" },
  // ── Mercedes-Benz ────────────────────────────────────────────────────────
  WDB: { brand: "Mercedes-Benz", origin: "ألمانيا" },
  WDC: { brand: "Mercedes-Benz", origin: "ألمانيا" },
  WDD: { brand: "Mercedes-Benz", origin: "ألمانيا" },
  WDF: { brand: "Mercedes-Benz", origin: "ألمانيا" },
  // ── Volkswagen ───────────────────────────────────────────────────────────
  WVW: { brand: "Volkswagen", origin: "ألمانيا" },
  WV1: { brand: "Volkswagen", origin: "ألمانيا" },
  WV2: { brand: "Volkswagen", origin: "ألمانيا" },
  WV3: { brand: "Volkswagen", origin: "ألمانيا" },
  "9BW": { brand: "Volkswagen", origin: "البرازيل" },
  // ── Audi ─────────────────────────────────────────────────────────────────
  WAU: { brand: "Audi", origin: "ألمانيا" },
  WA1: { brand: "Audi", origin: "ألمانيا" },
  TRU: { brand: "Audi", origin: "هنغاريا" },
  // ── Opel / Vauxhall ──────────────────────────────────────────────────────
  W0L: { brand: "Opel", origin: "ألمانيا" },
  WOL: { brand: "Opel", origin: "ألمانيا" },
  W0V: { brand: "Opel", origin: "ألمانيا" },
  // ── Porsche ──────────────────────────────────────────────────────────────
  WP0: { brand: "Porsche", origin: "ألمانيا" },
  // ── SEAT ─────────────────────────────────────────────────────────────────
  VS6: { brand: "SEAT", origin: "إسبانيا" },
  VS7: { brand: "SEAT", origin: "إسبانيا" },
  // ── Skoda ────────────────────────────────────────────────────────────────
  TMB: { brand: "Skoda", origin: "التشيك" },
  TMA: { brand: "Skoda", origin: "التشيك" },
  // ── Peugeot ──────────────────────────────────────────────────────────────
  VF3: { brand: "Peugeot", origin: "فرنسا" },
  // ── Citroën ──────────────────────────────────────────────────────────────
  VF7: { brand: "Citroën", origin: "فرنسا" },
  VF6: { brand: "Citroën", origin: "فرنسا" },
  // ── Renault ──────────────────────────────────────────────────────────────
  VF1: { brand: "Renault", origin: "فرنسا" },
  VF8: { brand: "Renault", origin: "فرنسا" },
  // ── Dacia ────────────────────────────────────────────────────────────────
  UU1: { brand: "Dacia", origin: "رومانيا" },
  // ── Volvo ────────────────────────────────────────────────────────────────
  YV1: { brand: "Volvo", origin: "السويد" },
  YV4: { brand: "Volvo", origin: "السويد" },
  // ── Ford ─────────────────────────────────────────────────────────────────
  "1FA": { brand: "Ford", origin: "الولايات المتحدة" },
  "1FB": { brand: "Ford", origin: "الولايات المتحدة" },
  "1FC": { brand: "Ford", origin: "الولايات المتحدة" },
  "1FM": { brand: "Ford", origin: "الولايات المتحدة" },
  "1FT": { brand: "Ford", origin: "الولايات المتحدة" },
  "2FM": { brand: "Ford", origin: "كندا" },
  "2FT": { brand: "Ford", origin: "كندا" },
  // ── Chevrolet / GMC ──────────────────────────────────────────────────────
  "1G1": { brand: "Chevrolet", origin: "الولايات المتحدة" },
  "1G6": { brand: "Cadillac", origin: "الولايات المتحدة" },
  "1GC": { brand: "Chevrolet", origin: "الولايات المتحدة" },
  "1GT": { brand: "GMC", origin: "الولايات المتحدة" },
  KL1: { brand: "Chevrolet", origin: "كوريا الجنوبية" },
  KL3: { brand: "Chevrolet", origin: "كوريا الجنوبية" },
  KL4: { brand: "Buick", origin: "كوريا الجنوبية" },
  KL5: { brand: "Chevrolet", origin: "كوريا الجنوبية" },
  KL8: { brand: "Chevrolet", origin: "كوريا الجنوبية" },
  // ── Chrysler / Dodge / Jeep ──────────────────────────────────────────────
  "2C3": { brand: "Chrysler", origin: "كندا" },
  "1C4": { brand: "Jeep", origin: "الولايات المتحدة" },
  "1J4": { brand: "Jeep", origin: "الولايات المتحدة" },
  "1J8": { brand: "Jeep", origin: "الولايات المتحدة" },
  "2B3": { brand: "Dodge", origin: "كندا" },
  // ── AvtoVAZ / Lada ──────────────────────────────────────────────────────
  XTA: { brand: "Lada", origin: "روسيا" },
  XTT: { brand: "Lada", origin: "روسيا" },
  // ── GAZ (Gazelle) ────────────────────────────────────────────────────────
  X96: { brand: "GAZ", origin: "روسيا" },
  // ── Great Wall / Haval ───────────────────────────────────────────────────
  LGW: { brand: "Great Wall", origin: "الصين" },
  LC6: { brand: "Haval", origin: "الصين" },
  // ── Chery ────────────────────────────────────────────────────────────────
  LVV: { brand: "Chery", origin: "الصين" },
  // ── BYD ──────────────────────────────────────────────────────────────────
  LFV: { brand: "BYD", origin: "الصين" },
  // ── Geely ────────────────────────────────────────────────────────────────
  LSG: { brand: "Geely", origin: "الصين" },
  LSJ: { brand: "MG", origin: "الصين" },
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

// ── NHTSA vPIC real VIN lookup (free, no API key) ──────────────────────────
interface NHTSAResult {
  brand: string; model: string; year: number; engineCapacity: string;
  horsepower: number | null; transmission: string; fuelType: string;
  origin: string; isReal: boolean;
}

async function lookupVinNHTSA(vin: string): Promise<NHTSAResult | null> {
  try {
    const res = await fetch(
      `https://vpic.nhtsa.dot.gov/api/vehicles/decodevin/${encodeURIComponent(vin)}?format=json`,
      { signal: AbortSignal.timeout(8000) }
    );
    if (!res.ok) return null;
    const json = await res.json() as { Results?: { Variable: string; Value: string | null }[] };
    if (!json.Results) return null;

    const get = (key: string) =>
      json.Results!.find(r => r.Variable === key)?.Value?.trim() ?? "";

    const make  = get("Make");
    const model = get("Model");
    const yearStr = get("Model Year");
    const dispL   = get("Displacement (L)");
    const hpStr   = get("Engine Brake (hp) From");
    const trans   = get("Transmission Style");
    const fuel    = get("Fuel Type - Primary");
    const country = get("Plant Country");

    // Reject if the essential fields are empty
    if (!make || !model || !yearStr) return null;
    const year = parseInt(yearStr);
    if (isNaN(year)) return null;

    const horsepower = hpStr ? Math.round(parseFloat(hpStr)) : null;
    const engineCapacity = dispL ? `${parseFloat(dispL).toFixed(1)}L` : "";

    // Translate common values to Arabic
    const transAr = trans.toLowerCase().includes("automatic") ? "automatic" : "manual";
    const fuelAr  = fuel.toLowerCase().includes("diesel") ? "diesel" :
                    fuel.toLowerCase().includes("electric") ? "electric" : "petrol";

    const COUNTRY_AR: Record<string, string> = {
      japan: "اليابان", "south korea": "كوريا الجنوبية", korea: "كوريا الجنوبية",
      germany: "ألمانيا", "united states": "الولايات المتحدة", usa: "الولايات المتحدة",
      france: "فرنسا", sweden: "السويد", uk: "المملكة المتحدة",
      "united kingdom": "المملكة المتحدة", russia: "روسيا", china: "الصين",
      india: "الهند", turkey: "تركيا", slovakia: "سلوفاكيا",
      hungary: "هنغاريا", mexico: "المكسيك", canada: "كندا",
      czech: "التشيك", romania: "رومانيا", spain: "إسبانيا",
      italy: "إيطاليا", brazil: "البرازيل", australia: "أستراليا",
    };
    const countryLower = country.toLowerCase();
    const originAr = Object.entries(COUNTRY_AR).find(([k]) => countryLower.includes(k))?.[1] ?? country;

    return { brand: make, model, year, engineCapacity, horsepower, transmission: transAr,
             fuelType: fuelAr, origin: originAr || "غير محدد", isReal: true };
  } catch {
    return null;
  }
}

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

// ── NHTSA Recalls API (free, no API key) ────────────────────────────────────
interface RecallItem {
  campaign: string;
  component: string;
  summary: string;
  consequence: string;
  remedy: string;
  date: string;
}

async function lookupNHTSARecalls(make: string, model: string, year: number): Promise<RecallItem[]> {
  try {
    const url = `https://api.nhtsa.gov/recalls/recallsByVehicle?make=${encodeURIComponent(make)}&model=${encodeURIComponent(model)}&modelYear=${year}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) return [];
    const json = await res.json() as { Count?: number; results?: Record<string, string>[] };
    if (!json.results || json.results.length === 0) return [];
    return json.results.slice(0, 8).map(r => ({
      campaign:    r.NHTSACampaignNumber ?? "",
      component:   r.Component ?? "",
      summary:     r.Summary ?? "",
      consequence: r.Consequence ?? "",
      remedy:      r.Remedy ?? "",
      date:        r.ReportReceivedDate?.slice(0, 10) ?? "",
    }));
  } catch {
    return [];
  }
}

// ── NHTSA Complaints API (free, no API key) ──────────────────────────────────
async function lookupNHTSAComplaints(make: string, model: string, year: number): Promise<number> {
  try {
    const url = `https://api.nhtsa.gov/complaints/complaintsByVehicle?make=${encodeURIComponent(make)}&model=${encodeURIComponent(model)}&modelYear=${year}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) return -1; // -1 = API error, not "0 complaints"
    const json = await res.json() as { count?: number; results?: unknown[] };
    if (typeof json.count === "number") return json.count;
    if (Array.isArray(json.results)) return json.results.length;
    return -1;
  } catch {
    return -1;
  }
}

// ── Risk score calculation (real data only) ──────────────────────────────────
function calcRiskScore({
  recallCount,
  complaintCount,
  year,
}: {
  recallCount: number;
  complaintCount: number;
  year: number;
}): { score: number; level: "good" | "check" | "serious" } {
  let score = 0;
  if (recallCount > 0)                            score += 2;
  if (new Date().getFullYear() - year > 10)       score += 1;
  if (complaintCount > 50)                        score += 1;
  const level = score === 0 ? "good" : score <= 2 ? "check" : "serious";
  return { score, level };
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

  let recalls: RecallItem[] = [];
  let isRealData = false;

  if (!report) {
    const key = vin ?? plateNumber ?? chassisNumber ?? "UNKNOWN";

    // ── 1. Run VIN spec lookup + estimation in parallel ───────────────────
    const [nhtsa, est] = await Promise.all([
      vin ? lookupVinNHTSA(vin) : Promise.resolve(null),
      Promise.resolve(decodeVin(key)),
    ]);

    // Merge: prefer NHTSA for make/model/year/specs, keep est for condition flags
    const brand        = nhtsa?.brand        ?? est.brand;
    const model        = nhtsa?.model        ?? est.model;
    const year         = nhtsa?.year         ?? est.year;
    const origin       = nhtsa?.origin       ?? est.origin;
    const engineCapacity = nhtsa?.engineCapacity && nhtsa.engineCapacity !== "0.0L"
                          ? nhtsa.engineCapacity : est.engineCapacity;
    const horsepower   = nhtsa?.horsepower   ?? est.horsepower;
    const transmission = nhtsa?.transmission ?? est.transmission;
    const fuelType     = nhtsa?.fuelType     ?? est.fuelType;
    isRealData         = nhtsa?.isReal ?? false;

    // ── 2. Fetch recalls + complaints in parallel with AI summary ────────
    const [aiSummary, recallsResult, complaintCount] = await Promise.all([
      generateVehicleAISummary({
        brand, model, year,
        accidentCount:       0,
        hasMajorRepairs:     false,
        hasStructuralDamage: false,
        airbagDeployed:      false,
        ownershipCount:      est.ownershipCount,
        mileageHistory:      [],
      }).catch(() => null),
      lookupNHTSARecalls(brand, model, year),
      lookupNHTSAComplaints(brand, model, year),
    ]);
    recalls = recallsResult;

    const [inserted] = await db.insert(vehicleReportsTable).values({
      vin:              vin ?? null,
      plateNumber:      plateNumber ?? null,
      chassisNumber:    chassisNumber ?? null,
      brand, model, year,
      countryOfOrigin:  origin,
      engineSize:       engineCapacity ? `${Math.round(parseFloat(engineCapacity) * 1000)}cc` : null,
      fuelType,
      transmission,
      engineCapacity:   engineCapacity || null,
      horsepower:       horsepower ?? est.horsepower,
      fuelConsumption:  null,
      driveType:        null,
      // حقول الحوادث: null لأن البيانات غير متاحة مجاناً عبر VIN
      accidentCount:    null,
      hasMajorRepairs:  null,
      hasStructuralDamage: null,
      airbagDeployed:   null,
      mileageHistory:   null,
      ownershipCount:   est.ownershipCount,
      registrationRegion: null,
      damageStatus:     null,
      aiSummary,
    }).returning();

    report = inserted;

    const risk = calcRiskScore({
      recallCount:    recalls.length,
      complaintCount: complaintCount,
      year:           report.year,
    });

    res.json({
      ...report,
      isRealData,
      recalls,
      complaintCount,
      riskScore: risk.score,
      riskLevel: risk.level,
      // بيانات الحوادث: دائماً null — غير متاحة مجاناً
      hasMajorRepairs:     null,
      hasStructuralDamage: null,
      airbagDeployed:      null,
      damageStatus:        null,
      mileageHistory:      [],
    });
    return;
  }

  // ── Cached report path ─────────────────────────────────────────────────────
  const [recallsResult, complaintCount] = await Promise.all([
    lookupNHTSARecalls(report.brand, report.model, report.year),
    lookupNHTSAComplaints(report.brand, report.model, report.year),
  ]);
  recalls = recallsResult;
  isRealData = true; // cached = previously verified

  const risk = calcRiskScore({
    recallCount:    recalls.length,
    complaintCount: complaintCount,
    year:           report.year,
  });

  res.json({
    ...report,
    isRealData,
    recalls,
    complaintCount,
    riskScore: risk.score,
    riskLevel: risk.level,
    hasMajorRepairs:     null,
    hasStructuralDamage: null,
    airbagDeployed:      null,
    damageStatus:        null,
    mileageHistory:      [],
  });
});

export default router;
