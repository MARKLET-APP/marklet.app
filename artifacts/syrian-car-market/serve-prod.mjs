/**
 * Minimal production static file server for the React SPA.
 * Uses only Node.js built-ins — no external packages needed.
 * Serves dist/public/ and falls back to index.html for SPA routing.
 */
import { createServer } from "http";
import { createReadStream, existsSync, statSync } from "fs";
import { join, extname } from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = join(__dirname, "dist", "public");
const PORT = parseInt(process.env.PORT ?? "20307", 10);

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript",
  ".mjs": "application/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
  ".txt": "text/plain",
  ".xml": "application/xml",
  ".apk": "application/vnd.android.package-archive",
};

const server = createServer((req, res) => {
  const url = (req.url ?? "/").split("?")[0];
  let filePath = join(PUBLIC_DIR, url);

  // SPA fallback: serve index.html for any path that isn't a real file
  if (!existsSync(filePath) || statSync(filePath).isDirectory()) {
    filePath = join(PUBLIC_DIR, "index.html");
  }

  const ext = extname(filePath).toLowerCase();
  const contentType = MIME[ext] ?? "application/octet-stream";
  const isHtml = ext === ".html";

  res.setHeader("Content-Type", contentType);
  res.setHeader("Cache-Control", isHtml ? "no-cache" : "public, max-age=86400");
  res.setHeader("X-Content-Type-Options", "nosniff");

  const stream = createReadStream(filePath);
  stream.on("error", () => {
    res.writeHead(404);
    res.end("Not found");
  });
  res.writeHead(200);
  stream.pipe(res);
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`[web] Static server ready on port ${PORT}`);
});
