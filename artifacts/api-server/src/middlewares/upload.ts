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
    fileSize: 10 * 1024 * 1024, // 10 MB
  },
  fileFilter: (_req, file, cb) => {
    const mimeOk = IMAGE_MIME.test(file.mimetype);
    const extOk  = IMAGE_EXT.test(file.originalname);
    const isGeneric = file.mimetype === "application/octet-stream" || file.mimetype === "application/unknown";
    if (mimeOk || (isGeneric && extOk)) cb(null, true);
    else cb(new Error("نوع الملف غير مدعوم — يُسمح فقط بصور JPEG/PNG/WebP"));
  },
});

/** تحقق ما إذا كان البافر JPEG بالبايتات السحرية */
function isJpegBuffer(buf: Buffer): boolean {
  return buf.length > 2 && buf[0] === 0xff && buf[1] === 0xd8;
}

/** تحقق ما إذا كان البافر PNG */
function isPngBuffer(buf: Buffer): boolean {
  return buf.length > 3 && buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47;
}

export const processImage = async (file: Express.Multer.File, folder = "uploads"): Promise<string> => {
  const fileName = Date.now() + ".jpg";
  const uploadPath = path.join("uploads", folder);

  if (!fs.existsSync(uploadPath)) {
    fs.mkdirSync(uploadPath, { recursive: true });
  }

  const finalPath = path.join(uploadPath, fileName);

  try {
    // المحاولة الأولى: معالجة sharp (تدعم JPEG/PNG/WebP/GIF)
    await sharp(file.buffer)
      .rotate()
      .resize({ width: 1600, withoutEnlargement: true })
      .jpeg({ quality: 82, progressive: true })
      .toFile(finalPath);
  } catch (sharpErr: any) {
    // Fallback: إذا فشل sharp (مثلاً صور HEIC/HEIF غير مدعومة في هذا الخادم)
    const buf = file.buffer;

    if (isJpegBuffer(buf)) {
      // الملف JPEG فعلاً — احفظه مباشرة
      fs.writeFileSync(finalPath, buf);
    } else if (isPngBuffer(buf)) {
      // PNG — حوّله بشكل بسيط بدون ميزات متقدمة
      try {
        await sharp(buf).jpeg({ quality: 82 }).toFile(finalPath);
      } catch {
        fs.writeFileSync(finalPath, buf);
      }
    } else {
      // HEIC أو صيغة غير مدعومة — أعد خطأ واضحاً للمستخدم
      throw new Error(
        "صيغة الصورة (HEIC) غير مدعومة على هذا الخادم. يرجى تحويل الصورة إلى JPEG أو PNG قبل الرفع."
      );
    }
  }

  return `/api/uploads/${folder}/${fileName}`;
};
