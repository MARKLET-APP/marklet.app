/**
 * cropImage — يأخذ File + بيانات منطقة الاقتصاص ويعيد { blob, dataUrl }
 * الناتج دائماً JPEG 4:3 بحجم 1200×900
 */

export interface CropArea {
  x: number;
  y: number;
  width: number;
  height: number;
}

const OUT_W = 1200;
const OUT_H = 900;
const JPEG_Q = 0.88;

export async function cropImageToBlob(
  file: File,
  cropArea: CropArea,
): Promise<{ blob: Blob; dataUrl: string }> {
  const imageSrc = await readFileAsDataURL(file);

  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = OUT_W;
      canvas.height = OUT_H;
      const ctx = canvas.getContext("2d");
      if (!ctx) return reject(new Error("Canvas not supported"));

      ctx.drawImage(
        img,
        cropArea.x,
        cropArea.y,
        cropArea.width,
        cropArea.height,
        0,
        0,
        OUT_W,
        OUT_H,
      );

      canvas.toBlob(
        (blob) => {
          if (!blob) return reject(new Error("Canvas toBlob failed"));
          const dataUrl = canvas.toDataURL("image/jpeg", JPEG_Q);
          resolve({ blob, dataUrl });
        },
        "image/jpeg",
        JPEG_Q,
      );
    };
    img.onerror = reject;
    img.src = imageSrc;
  });
}

function readFileAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function blobToFile(blob: Blob, name = "image.jpg"): File {
  return new File([blob], name, { type: "image/jpeg" });
}
