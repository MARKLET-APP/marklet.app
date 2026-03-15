/**
 * Seed Data Generator — MARKLET
 * Generates 100 sample car/motorcycle/parts listings for testing.
 *
 * Usage (from workspace root):
 *   cd artifacts/api-server && node --import tsx/esm ../../scripts/seedData.ts
 *
 *   Or via the db package npm script:
 *   pnpm --filter @workspace/db run seed
 */
import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "../lib/db/src/schema/index.js";

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL env variable is required.");
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle(pool, { schema });

// ── Reference data ────────────────────────────────────────────────────────────

const brands = ["Toyota", "Hyundai", "Kia", "BMW", "Mercedes", "Nissan", "Chevrolet", "Honda", "Mazda", "Mitsubishi", "Suzuki", "Volkswagen", "Lada", "Chery"];
const models: Record<string, string[]> = {
  Toyota: ["Camry", "Corolla", "Land Cruiser", "RAV4", "Yaris"],
  Hyundai: ["Elantra", "Tucson", "Santa Fe", "i10", "i20"],
  Kia: ["Cerato", "Sportage", "Sorento", "Picanto", "Rio"],
  BMW: ["316", "320", "520", "X5", "X3"],
  Mercedes: ["C180", "C200", "E200", "GLE", "CLA"],
  Nissan: ["Sunny", "Patrol", "X-Trail", "Micra", "Altima"],
  Chevrolet: ["Optra", "Aveo", "Malibu", "Blazer", "Captiva"],
  Honda: ["Civic", "Accord", "HR-V", "CR-V", "Jazz"],
  Mazda: ["Mazda3", "Mazda6", "CX-5", "CX-30", "Mazda2"],
  Mitsubishi: ["Lancer", "Outlander", "Eclipse Cross", "L200", "Pajero"],
  Suzuki: ["Swift", "Vitara", "Jimny", "Baleno", "Celerio"],
  Volkswagen: ["Golf", "Passat", "Tiguan", "Polo", "Jetta"],
  Lada: ["Vesta", "Niva", "Granta", "Largus", "2107"],
  Chery: ["Tiggo 4", "Tiggo 7", "Arrizo 5", "Arrizo 6", "QQ"],
};

const provinces = ["Damascus", "Aleppo", "Homs", "Latakia", "Tartus", "Hama", "Deir ez-Zor", "Daraa"];
const cities: Record<string, string[]> = {
  Damascus: ["دمشق", "المزة", "كفرسوسة", "ركن الدين", "المالكي"],
  Aleppo: ["حلب", "العزيزية", "الجميلية", "السريان", "الحمدانية"],
  Homs: ["حمص", "الوعر", "الزهراء", "الإنشاءات", "كرم اللوز"],
  Latakia: ["اللاذقية", "الزراعة", "الصليبة", "المشروع", "الرمل"],
  Tartus: ["طرطوس", "صافيتا", "بانياس", "دريكيش", "القدموس"],
  Hama: ["حماة", "محردة", "طيبة الإمام", "صوران", "مصياف"],
  "Deir ez-Zor": ["دير الزور", "الميادين", "البوكمال", "الأشارة", "الموحسن"],
  Daraa: ["درعا", "نوى", "الصنمين", "إزرع", "بصرى الشام"],
};

const categories = ["sedan", "suv", "truck", "van", "motorcycle", "parts", "scrap"];
const categoryWeights = [35, 25, 10, 5, 10, 10, 5];
const fuelTypes = ["petrol", "diesel", "hybrid", "electric"];
const transmissions = ["automatic", "manual"];
const saleTypes = ["cash", "installment", "barter"];
const conditions = ["used", "new"];

const SELLER_IDS = [2, 6, 7, 11];

function weightedRandom<T>(items: T[], weights: number[]): T {
  const total = weights.reduce((s, w) => s + w, 0);
  let r = Math.random() * total;
  for (let i = 0; i < items.length; i++) {
    r -= weights[i];
    if (r <= 0) return items[i];
  }
  return items[items.length - 1];
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function buildDescription(brand: string, model: string, year: number, category: string): string {
  if (category === "motorcycle") {
    return `دراجة نارية ${brand} ${model} موديل ${year} — بحالة ممتازة، جاهزة للتجربة والفحص.`;
  }
  if (category === "parts") {
    return `قطعة غيار أصلية لـ ${brand} ${model} — حالة ممتازة، متوفرة للتسليم الفوري.`;
  }
  if (category === "scrap") {
    return `${brand} ${model} موديل ${year} — مطروحة للبيع كهيكل أو قطعاً.`;
  }
  return `للبيع ${brand} ${model} موديل ${year} — السيارة بحالة جيدة جداً وجاهزة للفحص. السعر قابل للتفاوض للجادين.`;
}

// ── Seed function ─────────────────────────────────────────────────────────────

async function seedAds(count = 100) {
  console.log(`\n🌱  Seeding ${count} listings into MARKLET database...\n`);

  let inserted = 0;

  for (let i = 0; i < count; i++) {
    const brand = pick(brands);
    const model = pick(models[brand] ?? ["Standard"]);
    const year = randInt(2005, 2023);
    const category = weightedRandom(categories, categoryWeights);
    const province = pick(provinces);
    const city = pick(cities[province] ?? [province]);
    const sellerId = pick(SELLER_IDS);

    const basePrice: Record<string, [number, number]> = {
      sedan: [3000, 18000], suv: [6000, 30000], truck: [5000, 25000],
      van: [4000, 15000], motorcycle: [500, 4000], parts: [50, 800], scrap: [200, 1500],
    };
    const [pMin, pMax] = basePrice[category] ?? [1000, 12000];
    const price = randInt(pMin, pMax);
    const mileage = category === "motorcycle" || category === "parts" ? 0 : randInt(0, 250000);
    const fuelType = category === "parts" || category === "scrap" ? "petrol" : pick(fuelTypes);
    const transmission = category === "parts" || category === "scrap" ? "manual" : pick(transmissions);
    const saleType = pick(saleTypes);
    const condition = pick(conditions);
    const description = buildDescription(brand, model, year, category);

    await db.insert(schema.carsTable).values({
      sellerId,
      brand,
      model,
      year,
      price: String(price),
      mileage,
      fuelType,
      transmission,
      province,
      city,
      saleType,
      condition,
      category,
      description,
      status: "approved",
      isFeatured: Math.random() < 0.08,
      isHighlighted: Math.random() < 0.12,
      isActive: true,
    });

    inserted++;
    if (inserted % 10 === 0) process.stdout.write(`  ✓ ${inserted}/${count} inserted\r`);
  }

  console.log(`\n\n✅  Done! ${inserted} listings added successfully.`);
  console.log(`\nTest endpoints:`);
  console.log(`  GET /api/ads/cars`);
  console.log(`  GET /api/ads/motorcycles`);
  console.log(`  GET /api/ads/parts`);
  console.log(`  GET /api/feed`);
  console.log();
}

seedAds(100).finally(() => pool.end());
