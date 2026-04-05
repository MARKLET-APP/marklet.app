/**
 * useCropQueue — يُدير قائمة انتظار الصور للاقتصاص
 *
 * الاستخدام:
 *   const { openCropQueue, CropperComponent } = useCropQueue({ onCropped });
 *   openCropQueue(files);           // عند اختيار ملفات من input
 *   return <>{CropperComponent}</>;  // أضف في JSX
 */
import { useState, useCallback, ReactElement } from "react";
import { blobToFile } from "@/lib/cropImage";
import { ImageCropperDialog } from "@/components/ImageCropperDialog";

export interface CropResult {
  blob: Blob;
  file: File;
  dataUrl: string;
}

interface UseCropQueueOptions {
  onCropped: (result: CropResult) => Promise<void> | void;
}

interface UseCropQueueReturn {
  openCropQueue: (files: File[]) => void;
  CropperComponent: ReactElement | null;
}

export function useCropQueue({ onCropped }: UseCropQueueOptions): UseCropQueueReturn {
  const [queue, setQueue] = useState<File[]>([]);
  const [current, setCurrent] = useState<File | null>(null);

  const openCropQueue = useCallback((files: File[]) => {
    if (!files.length) return;
    const [first, ...rest] = files;
    setCurrent(first);
    setQueue(rest);
  }, []);

  const advance = useCallback(() => {
    setQueue(prev => {
      const [next, ...remaining] = prev;
      setCurrent(next ?? null);
      return remaining;
    });
  }, []);

  const handleConfirm = useCallback(
    async (blob: Blob, dataUrl: string) => {
      const file = blobToFile(blob, `image_${Date.now()}.jpg`);
      await onCropped({ blob, file, dataUrl });
      advance();
    },
    [onCropped, advance],
  );

  const handleCancel = useCallback(() => {
    setQueue([]);
    setCurrent(null);
  }, []);

  const CropperComponent =
    current !== null ? (
      <ImageCropperDialog
        file={current}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
      />
    ) : null;

  return { openCropQueue, CropperComponent };
}
