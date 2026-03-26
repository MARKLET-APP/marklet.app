import express, { type Express } from "express";
import cors from "cors";
import path from "path";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import router from "./routes";

const app: Express = express();

app.set("trust proxy", 1);
app.use(helmet());

// Light limiter for write operations only (POST/PUT/DELETE) — keyed by Authorization header
// to avoid penalizing all users when behind Replit's shared proxy IP.
const writeLimiter = rateLimit({
  windowMs: 60 * 1000,        // 1 minute
  max: 60,                    // 60 writes per minute per token
  standardHeaders: true,
  legacyHeaders: false,
  validate: false,                            // disable all validation warnings (Replit proxy)
  skip: (req) => {
    // Skip all read-only methods
    if (req.method === "GET" || req.method === "HEAD" || req.method === "OPTIONS") return true;
    // Skip view tracking — fires automatically on every car page, causes 429 cascades
    if (req.path === "/api/ad/view" || req.path === "/ad/view") return true;
    // Skip unauthenticated writes — they'll hit 401 in the route handler anyway
    if (!req.headers["authorization"]) return true;
    return false;
  },
  keyGenerator: (req) => {
    const auth = req.headers["authorization"];
    return auth ? auth.slice(-32) : "anonymous"; // last 32 chars of JWT = unique per user
  },
  message: { error: "Too many requests, please slow down." },
});

app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

app.use("/api/uploads", express.static(path.join(process.cwd(), "uploads")));
app.use("/api/uploads/chat", express.static(path.join(process.cwd(), "uploads", "chat")));

app.use("/api", writeLimiter, router);

app.get("/app-link", (req, res) => {
  const replSlug = process.env.REPL_SLUG;
  const replOwner = process.env.REPL_OWNER;
  const devDomain = process.env.REPLIT_DEV_DOMAIN;

  const publicURL = devDomain
    ? `https://${devDomain}`
    : replSlug && replOwner
      ? `https://${replSlug}.${replOwner}.repl.co`
      : `${req.protocol}://${req.get("host")}`;

  res.send(`
    <!DOCTYPE html>
    <html lang="ar" dir="rtl">
    <head>
      <meta charset="UTF-8" />
      <title>MARKLET - رابط التطبيق</title>
      <style>
        body { font-family: 'Segoe UI', sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; background: #f0fdf4; }
        .card { background: white; border-radius: 16px; padding: 40px; text-align: center; box-shadow: 0 4px 24px rgba(0,0,0,.08); max-width: 480px; width: 90%; }
        h2 { color: #16a34a; margin-bottom: 8px; }
        p { color: #6b7280; margin-bottom: 24px; }
        a { display: inline-block; background: #16a34a; color: white; text-decoration: none; padding: 12px 28px; border-radius: 10px; font-weight: bold; font-size: 16px; }
        a:hover { background: #15803d; }
        .url { color: #16a34a; font-size: 13px; margin-top: 12px; word-break: break-all; }
      </style>
    </head>
    <body>
      <div class="card">
        <h2>🚗 MARKLET جاهز للعمل</h2>
        <p>افتح التطبيق من الرابط التالي:</p>
        <a href="${publicURL}" target="_blank">افتح التطبيق</a>
        <p class="url">${publicURL}</p>
      </div>
    </body>
    </html>
  `);
});

export default app;
