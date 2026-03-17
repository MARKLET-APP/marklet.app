import { Router, type IRouter } from "express";
import { db, carsTable, carPartsTable, junkCarsTable, rentalCarsTable, usersTable, imagesTable } from "@workspace/db";
import { eq, desc, or, ilike, and, gte, lte, inArray, SQL } from "drizzle-orm";

const router: IRouter = Router();

function buildWhere(conditions: (SQL | undefined)[]): SQL | undefined {
  const valid = conditions.filter((c): c is SQL => c != null);
  if (valid.length === 0) return undefined;
  if (valid.length === 1) return valid[0];
  return and(...valid);
}

router.get("/search", async (req: any, res): Promise<void> => {
  const {
    q        = "",
    province = "",
    type     = "all",
    minPrice,
    maxPrice,
    minYear,
    maxYear,
    brand,
    limit    = "60",
  } = req.query as Record<string, string>;

  const lim = Math.min(parseInt(limit) || 60, 200);
  const results: any[] = [];

  const qText = q.trim();

  try {
    // ── CARS ──────────────────────────────────────────────────────────────────
    if (type === "all" || type === "car" || type === "motorcycle" || type === "plates") {
      const conds: (SQL | undefined)[] = [eq(carsTable.status, "approved")];

      if (type === "motorcycle") conds.push(eq(carsTable.category, "motorcycle"));
      else if (type === "plates") conds.push(eq(carsTable.category, "plates"));

      if (qText) conds.push(or(
        ilike(carsTable.brand, `%${qText}%`),
        ilike(carsTable.model, `%${qText}%`),
        ilike(carsTable.description, `%${qText}%`),
      ));
      if (province) conds.push(or(
        ilike(carsTable.city,     `%${province}%`),
        ilike(carsTable.province, `%${province}%`),
      ));
      if (brand)    conds.push(ilike(carsTable.brand, `%${brand}%`));
      if (minYear)  conds.push(gte(carsTable.year, parseInt(minYear)));
      if (maxYear)  conds.push(lte(carsTable.year, parseInt(maxYear)));

      const rows = await db.select({
        id:          carsTable.id,
        brand:       carsTable.brand,
        model:       carsTable.model,
        year:        carsTable.year,
        price:       carsTable.price,
        city:        carsTable.city,
        province:    carsTable.province,
        saleType:    carsTable.saleType,
        category:    carsTable.category,
        condition:   carsTable.condition,
        description: carsTable.description,
        createdAt:   carsTable.createdAt,
        sellerName:  usersTable.name,
      })
        .from(carsTable)
        .leftJoin(usersTable, eq(carsTable.sellerId, usersTable.id))
        .where(buildWhere(conds))
        .orderBy(desc(carsTable.createdAt))
        .limit(lim);

      // Fetch images separately for cars
      if (rows.length > 0) {
        const ids = rows.map(r => r.id);
        const imgs = await db.select({ carId: imagesTable.carId, url: imagesTable.imageUrl })
          .from(imagesTable)
          .where(inArray(imagesTable.carId, ids));
        const imgMap: Record<number, string[]> = {};
        imgs.forEach(i => { if (!imgMap[i.carId]) imgMap[i.carId] = []; imgMap[i.carId].push(i.url); });

        rows.forEach(r => results.push({
          ...r,
          _type:  r.category === "motorcycle" ? "motorcycle" : r.category === "plates" ? "plates" : "car",
          price:  r.price ? Number(r.price) : null,
          images: imgMap[r.id] ?? [],
          title:  `${r.brand ?? ""} ${r.model ?? ""} ${r.year ?? ""}`.trim(),
        }));
      }
    }

    // ── RENTAL CARS ───────────────────────────────────────────────────────────
    if (type === "all" || type === "rental") {
      const conds: (SQL | undefined)[] = [eq(rentalCarsTable.isApproved, true)];

      if (qText)   conds.push(or(
        ilike(rentalCarsTable.brand,       `%${qText}%`),
        ilike(rentalCarsTable.model,       `%${qText}%`),
        ilike(rentalCarsTable.description, `%${qText}%`),
      ));
      if (province) conds.push(ilike(rentalCarsTable.city, `%${province}%`));
      if (brand)    conds.push(ilike(rentalCarsTable.brand, `%${brand}%`));
      if (minYear)  conds.push(gte(rentalCarsTable.year, parseInt(minYear)));
      if (maxYear)  conds.push(lte(rentalCarsTable.year, parseInt(maxYear)));

      const rows = await db.select({
        id:          rentalCarsTable.id,
        brand:       rentalCarsTable.brand,
        model:       rentalCarsTable.model,
        year:        rentalCarsTable.year,
        city:        rentalCarsTable.city,
        dailyPrice:  rentalCarsTable.dailyPrice,
        images:      rentalCarsTable.images,
        description: rentalCarsTable.description,
        createdAt:   rentalCarsTable.createdAt,
        sellerName:  usersTable.name,
        sellerPhone: usersTable.phone,
      })
        .from(rentalCarsTable)
        .leftJoin(usersTable, eq(rentalCarsTable.sellerId, usersTable.id))
        .where(buildWhere(conds))
        .orderBy(desc(rentalCarsTable.createdAt))
        .limit(lim);

      rows.forEach(r => results.push({
        ...r,
        _type:      "rental",
        price:      r.dailyPrice ? Number(r.dailyPrice) : null,
        dailyPrice: r.dailyPrice ? Number(r.dailyPrice) : null,
        title:      `${r.brand ?? ""} ${r.model ?? ""} ${r.year ?? ""}`.trim(),
      }));
    }

    // ── CAR PARTS ─────────────────────────────────────────────────────────────
    if (type === "all" || type === "part") {
      const conds: (SQL | undefined)[] = [eq(carPartsTable.status, "approved")];

      if (qText)    conds.push(or(
        ilike(carPartsTable.name,        `%${qText}%`),
        ilike(carPartsTable.carType,     `%${qText}%`),
        ilike(carPartsTable.model,       `%${qText}%`),
        ilike(carPartsTable.description, `%${qText}%`),
      ));
      if (province) conds.push(ilike(carPartsTable.city, `%${province}%`));
      if (minPrice) conds.push(gte(carPartsTable.price, minPrice));
      if (maxPrice) conds.push(lte(carPartsTable.price, maxPrice));
      if (minYear)  conds.push(gte(carPartsTable.year, parseInt(minYear)));
      if (maxYear)  conds.push(lte(carPartsTable.year, parseInt(maxYear)));

      const rows = await db.select({
        id:          carPartsTable.id,
        name:        carPartsTable.name,
        carType:     carPartsTable.carType,
        model:       carPartsTable.model,
        year:        carPartsTable.year,
        price:       carPartsTable.price,
        city:        carPartsTable.city,
        images:      carPartsTable.images,
        description: carPartsTable.description,
        condition:   carPartsTable.condition,
        createdAt:   carPartsTable.createdAt,
        sellerName:  usersTable.name,
        sellerPhone: usersTable.phone,
      })
        .from(carPartsTable)
        .leftJoin(usersTable, eq(carPartsTable.sellerId, usersTable.id))
        .where(buildWhere(conds))
        .orderBy(desc(carPartsTable.createdAt))
        .limit(lim);

      rows.forEach(r => results.push({
        ...r,
        _type: "part",
        price: r.price ? Number(r.price) : null,
        brand: r.carType,
        title: r.name ?? "قطعة غيار",
      }));
    }

    // ── JUNK CARS ─────────────────────────────────────────────────────────────
    if (type === "all" || type === "junk") {
      const conds: (SQL | undefined)[] = [eq(junkCarsTable.status, "approved")];

      if (qText)    conds.push(or(
        ilike(junkCarsTable.type,        `%${qText}%`),
        ilike(junkCarsTable.model,       `%${qText}%`),
        ilike(junkCarsTable.description, `%${qText}%`),
      ));
      if (province) conds.push(ilike(junkCarsTable.city, `%${province}%`));
      if (minPrice) conds.push(gte(junkCarsTable.price, minPrice));
      if (maxPrice) conds.push(lte(junkCarsTable.price, maxPrice));
      if (minYear)  conds.push(gte(junkCarsTable.year, parseInt(minYear)));
      if (maxYear)  conds.push(lte(junkCarsTable.year, parseInt(maxYear)));

      const rows = await db.select({
        id:          junkCarsTable.id,
        type:        junkCarsTable.type,
        model:       junkCarsTable.model,
        year:        junkCarsTable.year,
        price:       junkCarsTable.price,
        city:        junkCarsTable.city,
        images:      junkCarsTable.images,
        description: junkCarsTable.description,
        condition:   junkCarsTable.condition,
        createdAt:   junkCarsTable.createdAt,
        sellerName:  usersTable.name,
        sellerPhone: usersTable.phone,
      })
        .from(junkCarsTable)
        .leftJoin(usersTable, eq(junkCarsTable.sellerId, usersTable.id))
        .where(buildWhere(conds))
        .orderBy(desc(junkCarsTable.createdAt))
        .limit(lim);

      rows.forEach(r => results.push({
        ...r,
        _type: "junk",
        price: r.price ? Number(r.price) : null,
        brand: r.type,
        title: `${r.type ?? "خردة"} ${r.model ?? ""}`.trim(),
      }));
    }

    results.sort((a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    res.json({ results: results.slice(0, lim), total: results.length });
  } catch (err: any) {
    console.error("Search error:", err.stack ?? err);
    res.status(500).json({ error: "Search failed", detail: err.message });
  }
});

export default router;
