import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import bcrypt from "bcryptjs";
import * as schema from "./schema/index.js";
import { eq } from "drizzle-orm";

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL env variable is required.");
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle(pool, { schema });

const ADMIN_USERS = [
  { email: "admin@carmarket.sy", password: "Admin@123", name: "Admin" },
  { email: "sohaib.szsz@gmail.com", password: "as55ssoo**", name: "صهيب" },
];

async function seedAdmins() {
  console.log("🔑  Seeding admin users...");

  for (const admin of ADMIN_USERS) {
    const existing = await db
      .select()
      .from(schema.usersTable)
      .where(eq(schema.usersTable.email, admin.email))
      .limit(1);

    if (existing.length > 0) {
      await db
        .update(schema.usersTable)
        .set({ role: "admin" })
        .where(eq(schema.usersTable.email, admin.email));
      console.log(`✅  Updated ${admin.email} → role: admin`);
    } else {
      const hashedPassword = await bcrypt.hash(admin.password, 10);
      await db.insert(schema.usersTable).values({
        email: admin.email,
        password: hashedPassword,
        name: admin.name,
        role: "admin",
      });
      console.log(`✅  Created ${admin.email} as admin`);
    }
  }

  await pool.end();
  console.log("✅  Admin seed complete.");
}

seedAdmins().catch((err) => {
  console.error("Admin seed failed:", err);
  process.exit(1);
});
