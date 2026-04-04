import multer from "multer";
import sharp from "sharp";
import path from "path";
import fs from "fs";

const storage = multer.memoryStorage();

const IMAGE_MIME = /jpeg|jpg|png|gif|webp|heic|heif/i;
const IMAGE_EXT  = /\.(jpe?g|png|gif|webp|heic|heif)$/i;

export const upload = multer({
  storage,
  limits: {
    fileSize: 20 * 1024 * 1024, // 20 MB — كاميرات Android/iOS تنتج ملفات كبيرة
  },
  fileFilter: (_req, file, cb) => {
    const mimeOk = IMAGE_MIME.test(file.mimetype);
    const extOk  = IMAGE_EXT.test(file.originalname);
    const isGeneric =
      file.mimetype === "application/octet-stream" ||
      file.mimetype === "application/unknown" ||
      file.mimetype === "";
    if (mimeOk || (isGeneric && extOk) || isGeneric) cb(null, true);
    else cb(new Error("نوع الملف غير مدعوم — يُسمح فقط بصور JPEG/PNG/WebP/HEIC"));
  },
});

/** تحقق إذا كان البافر HEIC/HEIF بالبايتات السحرية */
function isHeicBuffer(buf: Buffer): boolean {
  if (buf.length < 12) return false;
  // ftyp box header at offset 4
  const ftyp = buf.slice(4, 8).toString("ascii");
  if (ftyp !== "ftyp") return false;
  const brand = buf.slice(8, 12).toString("ascii").toLowerCase();
  return brand.startsWith("heic") || brand.startsWith("heif") || brand.startsWith("mif1") || brand.startsWith("msf1");
}

/** تحقق ما إذا كان البافر JPEG */
function isJpegBuffer(buf: Buffer): boolean {
  return buf.length > 2 && buf[0] === 0xff && buf[1] === 0xd8;
}

/** تحويل HEIC → JPEG بافر باستخدام heic-convert */
async function convertHeicToJpeg(buffer: Buffer): Promise<Buffer> {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const heicConvert = require("heic-convert");
  const outputBuffer = await heicConvert({
    buffer: buffer,
    format: "JPEG",
    quality: 0.82,
  });
  return Buffer.from(outputBuffer);
}

export const processImage = async (
  file: Express.Multer.File,
  folder = "uploads",
): Promise<string> => {
  const fileName = Date.now() + ".jpg";
  const uploadPath = path.join("uploads", folder);

  if (!fs.existsSync(uploadPath)) {
    fs.mkdirSync(uploadPath, { recursive: true });
  }

  const finalPath = path.join(uploadPath, fileName);

  let inputBuffer = file.buffer;

  // إذا كانت الصورة HEIC/HEIF → حوّلها لـ JPEG أولاً على الخادم
  if (isHeicBuffer(inputBuffer) || /heic|heif/i.test(file.mimetype) || /heic|heif/i.test(file.originalname)) {
    try {
      inputBuffer = await convertHeicToJpeg(inputBuffer);
    } catch (heicErr: any) {
      console.error("[Upload] HEIC convert error:", heicErr.message);
      throw new Error("فشل تحويل صورة HEIC — يرجى التقاط الصورة بصيغة JPEG من إعدادات الكاميرا");
    }
  }

  try {
    await sharp(inputBuffer)
      .rotate() // إصلاح الاتجاه تلقائياً
      .resize({ width: 1600, withoutEnlargement: true })
      .jpeg({ quality: 82, progressive: true })
      .toFile(finalPath);
  } catch (sharpErr: any) {
    // إذا فشل sharp والملف JPEG — احفظه مباشرة كـ fallback
    if (isJpegBuffer(inputBuffer)) {
      fs.writeFileSync(finalPath, inputBuffer);
    } else {
      console.error("[Upload] Sharp error:", sharpErr.message);
      throw new Error("فشل معالجة الصورة — يرجى استخدام صور JPEG أو PNG");
    }
  }

  return `/api/uploads/${folder}/${fileName}`;
};
