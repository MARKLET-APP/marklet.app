import { useState, useRef, useEffect, useCallback } from "react";
import { withApi } from "@/lib/runtimeConfig";
import { ImagePlus, X, Loader2, AlertCircle } from "lucide-react";
import { useCropQueue } from "@/hooks/useCropQueue";

interface MultiImageUploadProps {
  images: string[];
  onChange: (images: string[]) => void;
  max?: number;
}

interface PreviewItem {
  localUrl: string;
  serverUrl: string | null;
  uploading: boolean;
  error: boolean;
}

export const getPreview = (file: string | File | null | undefined): string => {
  if (typeof file === "string") return file;
  if (file instanceof File) return URL.createObjectURL(file);
  return "";
};

async function uploadSingle(file: File): Promise<string> {
  const formData = new FormData();
  formData.append("image", file);
  const token = localStorage.getItem("scm_token");
  const res = await fetch(withApi("/api/upload"), {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: formData,
  });
  if (!res.ok) throw new Error("Upload failed");
  const data = await res.json();
  return data.url as string;
}

export function MultiImageUpload({ images, onChange, max = 6 }: MultiImageUploadProps) {
  const [previews, setPreviews] = useState<PreviewItem[]>([]);
  const [globalError, setGlobalError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const objectUrlsRef = useRef<string[]>([]);

  useEffect(() => {
    if (images.length === 0) {
      setPreviews([]);
      objectUrlsRef.current.forEach(url => URL.revokeObjectURL(url));
      objectUrlsRef.current = [];
    }
  }, [images.length]);

  useEffect(() => {
    return () => {
      objectUrlsRef.current.forEach(url => URL.revokeObjectURL(url));
    };
  }, []);

  const uploadCropped = useCallback(async (blob: Blob, dataUrl: string) => {
    setGlobalError(null);
    const localUrl = dataUrl;
    const newItem: PreviewItem = { localUrl, serverUrl: null, uploading: true, error: false };
    setPreviews(prev => [...prev, newItem]);
    const idx = previews.length;
    try {
      const file = new File([blob], `image_${Date.now()}.jpg`, { type: "image/jpeg" });
      const url = await uploadSingle(file);
      setPreviews(prev => {
        const next = [...prev];
        const item = next.find(p => p.localUrl === localUrl);
        if (item) item.serverUrl = url;
        if (item) item.uploading = false;
        return next;
      });
      onChange([...images, url]);
    } catch {
      setPreviews(prev => {
        const next = [...prev];
        const item = next.find(p => p.localUrl === localUrl);
        if (item) item.uploading = false;
        if (item) item.error = true;
        return next;
      });
      setGlobalError("فشل رفع صورة");
    }
    void idx;
  }, [images, onChange, previews.length]);

  const { openCropQueue, CropperComponent } = useCropQueue({
    onCropped: ({ blob, dataUrl }) => uploadCropped(blob, dataUrl),
  });

  const handleFiles = (files: FileList) => {
    if (!files.length) return;
    const remaining = max - images.length - previews.filter(p => p.uploading).length;
    if (remaining <= 0) return;
    const toProcess = Array.from(files).slice(0, remaining);
    openCropQueue(toProcess);
    if (inputRef.current) inputRef.current.value = "";
  };

  const remove = (localUrl: string) => {
    setPreviews(prev => {
      const item = prev.find(p => p.localUrl === localUrl);
      if (item?.serverUrl) {
        onChange(images.filter(u => u !== item.serverUrl));
      }
      return prev.filter(p => p.localUrl !== localUrl);
    });
  };

  const totalShown = previews.length;

  return (
    <div className="space-y-2">
      {CropperComponent}
      <div className="flex flex-wrap gap-2">
        {previews.map((item) => (
          <div key={item.localUrl} className="relative w-20 h-20 rounded-lg overflow-hidden border border-border bg-muted">
            <img
              src={item.localUrl}
              alt=""
              className="w-full h-full object-cover"
              style={{ display: "block" }}
            />
            {item.uploading && (
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                <Loader2 className="w-4 h-4 animate-spin text-white" />
              </div>
            )}
            {item.error && (
              <div className="absolute inset-0 bg-red-900/70 flex items-center justify-center">
                <AlertCircle className="w-4 h-4 text-white" />
              </div>
            )}
            <button
              type="button"
              onClick={() => remove(item.localUrl)}
              className="absolute top-0.5 right-0.5 bg-black/80 rounded-full p-1 z-10"
            >
              <X className="w-3 h-3 text-white" />
            </button>
          </div>
        ))}
        {totalShown < max && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="w-20 h-20 border-2 border-dashed border-border rounded-lg flex flex-col items-center justify-center text-muted-foreground hover:border-primary hover:text-primary transition-colors"
          >
            <ImagePlus className="w-5 h-5" />
            <span className="text-xs mt-1">إضافة</span>
          </button>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        tabIndex={-1}
        aria-hidden="true"
        style={{ position: 'absolute', left: '-9999px', top: '-9999px', width: 0, height: 0, opacity: 0, pointerEvents: 'none' }}
        onChange={e => e.target.files && handleFiles(e.target.files)}
      />
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">{images.length}/{max} صور</p>
        {globalError && (
          <p className="text-xs text-destructive flex items-center gap-1">
            <AlertCircle className="w-3 h-3" />{globalError}
          </p>
        )}
      </div>
    </div>
  );
}
