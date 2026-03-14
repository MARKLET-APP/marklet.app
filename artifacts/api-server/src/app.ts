import express, { type Express } from "express";
import cors from "cors";
import path from "path";
import router from "./routes";

const app: Express = express();

app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

app.use("/api/uploads", express.static(path.join(process.cwd(), "uploads")));
app.use("/api/uploads/chat", express.static(path.join(process.cwd(), "uploads", "chat")));
app.use("/api", router);

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
      <title>CarNet - رابط التطبيق</title>
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
        <h2>🚗 CarNet جاهز للعمل</h2>
        <p>افتح التطبيق من الرابط التالي:</p>
        <a href="${publicURL}" target="_blank">افتح التطبيق</a>
        <p class="url">${publicURL}</p>
      </div>
    </body>
    </html>
  `);
});

export default app;
