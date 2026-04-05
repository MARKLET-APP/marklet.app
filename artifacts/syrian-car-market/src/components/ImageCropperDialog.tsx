/**
 * ImageCropperDialog — نافذة اقتصاص الصور
 * نسبة الأبعاد الثابتة: 4:3 أفقية (1200×900)
 * تعمل على الموبايل والويب مع دعم الإصبعين للتكبير
 */
import { useState, useCallback, useEffect, useMemo } from "react";
import Cropper from "react-easy-crop";
import type { Area } from "react-easy-crop";
import { Check, X, ZoomIn, ZoomOut } from "lucide-react";
import { cropImageToBlob } from "@/lib/cropImage";

interface Props {
  file: File | null;
  onConfirm: (blob: Blob, dataUrl: string) => void;
  onCancel: () => void;
}

export function ImageCropperDialog({ file, onConfirm, onCancel }: Props) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [processing, setProcessing] = useState(false);

  const onCropComplete = useCallback((_: Area, pixels: Area) => {
    setCroppedAreaPixels(pixels);
  }, []);

  const handleConfirm = async () => {
    if (!file || !croppedAreaPixels) return;
    setProcessing(true);
    try {
      const { blob, dataUrl } = await cropImageToBlob(file, croppedAreaPixels);
      onConfirm(blob, dataUrl);
    } catch {
      onCancel();
    } finally {
      setProcessing(false);
    }
  };

  const objectUrl = useMemo(() => {
    if (!file) return null;
    return URL.createObjectURL(file);
  }, [file]);

  useEffect(() => {
    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [objectUrl]);

  if (!file || !objectUrl) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] flex flex-col bg-black"
      dir="rtl"
      style={{ touchAction: "none" }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-black/80 border-b border-white/10">
        <span className="text-white font-bold text-base">اقتصاص الصورة</span>
        <span className="text-white/60 text-xs">نسبة 4:3 · 1200×900</span>
      </div>

      {/* Crop Area */}
      <div className="relative flex-1">
        <Cropper
          image={objectUrl}
          crop={crop}
          zoom={zoom}
          aspect={4 / 3}
          onCropChange={setCrop}
          onZoomChange={setZoom}
          onCropComplete={onCropComplete}
          style={{
            containerStyle: { background: "#000" },
            cropAreaStyle: {
              border: "2px solid #f97316",
              boxShadow: "0 0 0 9999px rgba(0,0,0,0.65)",
            },
          }}
          showGrid={false}
          minZoom={0.5}
          maxZoom={4}
          zoomSpeed={0.3}
        />
      </div>

      {/* Zoom Slider */}
      <div className="bg-black/90 px-6 py-3 flex items-center gap-3">
        <button
          type="button"
          onClick={() => setZoom(z => Math.max(0.5, z - 0.2))}
          className="text-white/70 hover:text-white transition-colors"
        >
          <ZoomOut className="w-5 h-5" />
        </button>
        <input
          type="range"
          min={0.5}
          max={4}
          step={0.05}
          value={zoom}
          onChange={e => setZoom(Number(e.target.value))}
          className="flex-1 accent-orange-500 h-1"
        />
        <button
          type="button"
          onClick={() => setZoom(z => Math.min(4, z + 0.2))}
          className="text-white/70 hover:text-white transition-colors"
        >
          <ZoomIn className="w-5 h-5" />
        </button>
      </div>

      {/* Instructions */}
      <div className="bg-black/90 px-4 pb-2 text-center">
        <p className="text-white/50 text-xs">اسحب الصورة لضبط المنطقة · قرّب وبعّد للتكبير</p>
      </div>

      {/* Action Buttons */}
      <div className="bg-black/90 px-4 pb-6 pt-2 flex gap-3">
        <button
          type="button"
          onClick={onCancel}
          disabled={processing}
          className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl border border-white/20 text-white font-semibold text-base active:scale-95 transition-transform"
        >
          <X className="w-5 h-5" />
          إلغاء
        </button>
        <button
          type="button"
          onClick={handleConfirm}
          disabled={processing}
          className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl bg-orange-500 text-white font-bold text-base active:scale-95 transition-transform disabled:opacity-60"
        >
          {processing ? (
            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <Check className="w-5 h-5" />
          )}
          {processing ? "جارٍ المعالجة..." : "تأكيد"}
        </button>
      </div>
    </div>
  );
}
