import { Storage } from "@google-cloud/storage";
import { randomUUID } from "crypto";
import fs from "fs";
import path from "path";

const REPLIT_SIDECAR = "http://127.0.0.1:1106";

// GCS is only available in Replit environments (sidecar at 127.0.0.1:1106)
export function isGcsEnabled(): boolean {
  return !!process.env.PRIVATE_OBJECT_DIR;
}

export const gcsClient = new Storage({
  credentials: {
    audience: "replit",
    subject_token_type: "access_token",
    token_url: `${REPLIT_SIDECAR}/token`,
    type: "external_account",
    credential_source: {
      url: `${REPLIT_SIDECAR}/credential`,
      format: { type: "json", subject_token_field_name: "access_token" },
    },
    universe_domain: "googleapis.com",
  },
  projectId: "",
});

function parseGcsPath(dirPath: string): { bucketName: string; objectPrefix: string } {
  const clean = dirPath.replace(/^\//, "");
  const idx = clean.indexOf("/");
  const bucketName = idx >= 0 ? clean.slice(0, idx) : clean;
  const objectPrefix = idx >= 0 ? clean.slice(idx + 1) : "";
  return { bucketName, objectPrefix };
}

function getGcsConfig() {
  const privateDir = process.env.PRIVATE_OBJECT_DIR!;
  return parseGcsPath(privateDir);
}

// ── Disk fallback helpers ─────────────────────────────────────────────────────

function saveToDisk(buffer: Buffer, folder: string, ext: string): string {
  const dir = path.join(process.cwd(), "uploads", folder);
  fs.mkdirSync(dir, { recursive: true });
  const uuid = randomUUID();
  const filename = `${uuid}.${ext}`;
  fs.writeFileSync(path.join(dir, filename), buffer);
  return `/api/uploads/${folder}/${filename}`;
}

function saveStreamToDisk(filePath: string, folder: string): string {
  const dir = path.join(process.cwd(), "uploads", folder);
  fs.mkdirSync(dir, { recursive: true });
  const ext = path.extname(filePath).slice(1) || "bin";
  const uuid = randomUUID();
  const filename = `${uuid}.${ext}`;
  fs.copyFileSync(filePath, path.join(dir, filename));
  return `/api/uploads/${folder}/${filename}`;
}

// ── Public API ────────────────────────────────────────────────────────────────

export async function uploadBufferToGCS(
  buffer: Buffer,
  folder: string,
  ext = "jpg",
  contentType = "image/jpeg",
): Promise<string> {
  if (!isGcsEnabled()) {
    return saveToDisk(buffer, folder, ext);
  }

  const { bucketName, objectPrefix } = getGcsConfig();
  const uuid = randomUUID();
  const objectName = objectPrefix
    ? `${objectPrefix}/${folder}/${uuid}.${ext}`
    : `${folder}/${uuid}.${ext}`;

  const bucket = gcsClient.bucket(bucketName);
  const file = bucket.file(objectName);
  await file.save(buffer, { metadata: { contentType } });

  return `/api/storage/objects/${folder}/${uuid}.${ext}`;
}

export async function uploadFileStreamToGCS(
  filePath: string,
  folder: string,
  contentType: string,
): Promise<string> {
  if (!isGcsEnabled()) {
    return saveStreamToDisk(filePath, folder);
  }

  const { bucketName, objectPrefix } = getGcsConfig();
  const ext = path.extname(filePath).slice(1) || "bin";
  const uuid = randomUUID();
  const objectName = objectPrefix
    ? `${objectPrefix}/${folder}/${uuid}.${ext}`
    : `${folder}/${uuid}.${ext}`;

  const bucket = gcsClient.bucket(bucketName);
  const file = bucket.file(objectName);

  await new Promise<void>((resolve, reject) => {
    const writeStream = file.createWriteStream({
      metadata: { contentType },
      resumable: false,
    });
    fs.createReadStream(filePath)
      .pipe(writeStream)
      .on("finish", resolve)
      .on("error", reject);
  });

  return `/api/storage/objects/${folder}/${uuid}.${ext}`;
}

export async function serveGcsObject(
  objectRelPath: string,
): Promise<{ stream: NodeJS.ReadableStream; contentType: string; size?: number } | null> {
  if (!isGcsEnabled()) return null;

  try {
    const { bucketName, objectPrefix } = getGcsConfig();
    const objectName = objectPrefix ? `${objectPrefix}/${objectRelPath}` : objectRelPath;

    const bucket = gcsClient.bucket(bucketName);
    const file = bucket.file(objectName);

    const [exists] = await file.exists();
    if (!exists) return null;

    const [metadata] = await file.getMetadata();
    return {
      stream: file.createReadStream(),
      contentType: (metadata.contentType as string) || "application/octet-stream",
      size: metadata.size ? Number(metadata.size) : undefined,
    };
  } catch {
    return null;
  }
}
