import { useState, useRef } from "react";
import { withApi } from "@/lib/runtimeConfig";
import { ImagePlus, X, Loader2, AlertCircle } from "lucide-react";

interface MultiImageUploadProps {
  images: string[];
  onChange: (images: string[]) => void;
  max?: number;
}

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
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFiles = async (files: FileList) => {
    if (!files.length) return;
    setUploading(true);
    setError(null);
    try {
      const remaining = max - images.length;
      const toUpload = Array.from(files).slice(0, remaining);
      const results = await Promise.allSettled(toUpload.map(uploadSingle));
      const urls = results.filter(r => r.status === "fulfilled").map(r => (r as PromiseFulfilledResult<string>).value);
      const failed = results.filter(r => r.status === "rejected").length;
      if (urls.length > 0) onChange([...images, ...urls]);
      if (failed > 0) setError(`فشل رفع ${failed} صورة`);
    } catch {
      setError("فشل رفع الصور، يرجى المحاولة مرة أخرى");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const remove = (idx: number) => {
    onChange(images.filter((_, i) => i !== idx));
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {images.map((url, i) => (
          <div key={i} className="relative w-20 h-20 rounded-lg overflow-hidden border border-border">
            <img src={url} alt="" className="w-full h-full object-cover" />
            <button
              type="button"
              onClick={() => remove(i)}
              className="absolute top-0.5 right-0.5 bg-black/70 rounded-full p-0.5"
            >
              <X className="w-3 h-3 text-white" />
            </button>
          </div>
        ))}
        {images.length < max && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className="w-20 h-20 border-2 border-dashed border-border rounded-lg flex flex-col items-center justify-center text-muted-foreground hover:border-primary hover:text-primary transition-colors"
          >
            {uploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <ImagePlus className="w-5 h-5" />}
            <span className="text-xs mt-1">{uploading ? "..." : "إضافة"}</span>
          </button>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={e => e.target.files && handleFiles(e.target.files)}
      />
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">{images.length}/{max} صور</p>
        {error && (
          <p className="text-xs text-destructive flex items-center gap-1">
            <AlertCircle className="w-3 h-3" />{error}
          </p>
        )}
      </div>
    </div>
  );
}
