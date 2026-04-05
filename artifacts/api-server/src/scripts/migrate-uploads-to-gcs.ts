/**
 * سكريبت ترحيل الصور من القرص المحلي إلى GCS
 * يرفع جميع الملفات من مجلد uploads/ إلى Google Cloud Storage
 * ثم يحدث قاعدة البيانات بروابط الـ GCS الجديدة
 *
 * تشغيل: pnpm --filter @workspace/api-server tsx src/scripts/migrate-uploads-to-gcs.ts
 */

import fs from "fs";
import path from "path";
import { gcsClient } from "../lib/gcsUpload.js";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";

const BUCKET_ID = process.env.DEFAULT_OBJECT_STORAGE_BUCKET_ID;
const PRIVATE_DIR = process.env.PRIVATE_OBJECT_DIR;

if (!BUCKET_ID || !PRIVATE_DIR) {
  console.error("❌ PRIVATE_OBJECT_DIR or DEFAULT_OBJECT_STORAGE_BUCKET_ID not set");
  process.exit(1);
}

function parseGcsPath(dirPath: string) {
  const clean = dirPath.replace(/^\//, "");
  const idx = clean.indexOf("/");
  return {
    bucketName: idx >= 0 ? clean.slice(0, idx) : clean,
    objectPrefix: idx >= 0 ? clean.slice(idx + 1) : "",
  };
}

const { bucketName, objectPrefix } = parseGcsPath(PRIVATE_DIR);
const bucket = gcsClient.bucket(bucketName);

const UPLOADS_DIR = path.join(process.cwd(), "uploads");
const API_UPLOADS_PREFIX = "/api/uploads/";
const API_STORAGE_PREFIX = "/api/storage/objects/";

let uploaded = 0;
let skipped = 0;
let failed = 0;

async function uploadFile(localPath: string, relPath: string): Promise<string | null> {
  const objectName = objectPrefix ? `${objectPrefix}/${relPath}` : relPath;
  const file = bucket.file(objectName);

  const [exists] = await file.exists();
  if (exists) {
    skipped++;
    return `/api/storage/objects/${relPath}`;
  }

  try {
    const buffer = fs.readFileSync(localPath);
    const ext = path.extname(localPath).slice(1).toLowerCase();
    const contentType =
      ext === "jpg" || ext === "jpeg" ? "image/jpeg" :
      ext === "png" ? "image/png" :
      ext === "webp" ? "image/webp" :
      ext === "avif" ? "image/avif" :
      ext === "gif" ? "image/gif" :
      ext === "mp4" ? "video/mp4" :
      ext === "webm" ? "audio/webm" :
      ext === "mp3" ? "audio/mpeg" :
      ext === "pdf" ? "application/pdf" :
      "application/octet-stream";

    await file.save(buffer, { metadata: { contentType } });
    uploaded++;
    return `/api/storage/objects/${relPath}`;
  } catch (err: any) {
    console.error(`  ❌ Failed to upload ${relPath}: ${err.message}`);
    failed++;
    return null;
  }
}

async function walkDir(dir: string, baseDir: string): Promise<Map<string, string>> {
  const urlMap = new Map<string, string>();
  if (!fs.existsSync(dir)) return urlMap;

  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      const subMap = await walkDir(fullPath, baseDir);
      for (const [k, v] of subMap) urlMap.set(k, v);
    } else if (entry.isFile()) {
      const relPath = path.relative(baseDir, fullPath).replace(/\\/g, "/");
      const oldUrl = `${API_UPLOADS_PREFIX}${relPath}`;
      process.stdout.write(`  ↑ ${relPath}... `);
      const newUrl = await uploadFile(fullPath, relPath);
      if (newUrl) {
        urlMap.set(oldUrl, newUrl);
        console.log(`✓ → ${newUrl}`);
      } else {
        console.log("✗");
      }
    }
  }
  return urlMap;
}

async function updateDatabase(urlMap: Map<string, string>): Promise<void> {
  if (urlMap.size === 0) {
    console.log("\n📊 No URLs to update in database.");
    return;
  }

  console.log(`\n📊 Updating database (${urlMap.size} URL mappings)...\n`);

  const tables: Array<{ table: string; columns: string[] }> = [
    { table: "images", columns: ["image_url"] },
    { table: "users", columns: ["profile_photo", "showroom_photo"] },
    { table: "showrooms", columns: ["logo", "cover_image"] },
    { table: "inspection_centers", columns: ["logo", "cover_image"] },
    { table: "scrap_centers", columns: ["logo", "cover_image"] },
    { table: "messages", columns: ["image_url"] },
    { table: "reels", columns: ["video_url", "thumbnail_url"] },
    { table: "car_parts", columns: ["image_url"] },
    { table: "junk_cars", columns: ["image_url"] },
    { table: "rental_cars", columns: ["image_url"] },
    { table: "real_estate", columns: ["image_url"] },
    { table: "jobs", columns: ["image_url"] },
    { table: "marketplace", columns: ["image_url"] },
    { table: "missing_cars", columns: ["image_url"] },
  ];

  for (const { table, columns } of tables) {
    for (const col of columns) {
      for (const [oldUrl, newUrl] of urlMap) {
        try {
          const result = await db.execute(
            sql.raw(`UPDATE ${table} SET ${col} = '${newUrl}' WHERE ${col} = '${oldUrl}'`)
          );
          const count = (result as any).rowCount ?? 0;
          if (count > 0) {
            console.log(`  ✓ ${table}.${col}: ${count} rows updated`);
          }
        } catch {
        }
      }
    }
  }
}

async function main() {
  console.log("🚀 بدء ترحيل الصور من القرص المحلي إلى Google Cloud Storage\n");
  console.log(`📦 Bucket: ${bucketName}`);
  console.log(`📁 Object prefix: ${objectPrefix}`);
  console.log(`📂 Local uploads dir: ${UPLOADS_DIR}\n`);

  if (!fs.existsSync(UPLOADS_DIR)) {
    console.log("⚠️  No uploads directory found. Nothing to migrate.");
    return;
  }

  console.log("⬆️  Uploading files...\n");
  const urlMap = await walkDir(UPLOADS_DIR, UPLOADS_DIR);

  console.log(`\n✅ Upload complete:`);
  console.log(`   ↑ Uploaded: ${uploaded} files`);
  console.log(`   ⏭  Skipped (already exists): ${skipped} files`);
  console.log(`   ❌ Failed: ${failed} files`);

  await updateDatabase(urlMap);

  console.log("\n🎉 Migration complete!");
  console.log("   Note: Old local files in uploads/ are kept as backup.");
  console.log("   You can delete them after verifying the migration.");
}

main().catch(console.error);
