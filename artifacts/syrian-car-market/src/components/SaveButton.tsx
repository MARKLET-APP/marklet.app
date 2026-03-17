import { Bookmark } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSaves, type ListingSaveType } from "@/hooks/use-saves";
import { cn } from "@/lib/utils";

interface SaveButtonProps {
  type: ListingSaveType;
  id: number;
  variant?: "icon" | "full";
  className?: string;
}

export function SaveButton({ type, id, variant = "full", className }: SaveButtonProps) {
  const { isSaved, toggleSave, isLoading } = useSaves();
  const saved = isSaved(type, id);

  if (variant === "icon") {
    return (
      <button
        onClick={(e) => { e.stopPropagation(); toggleSave(type, id); }}
        disabled={isLoading}
        className={cn(
          "flex items-center gap-1.5 text-sm transition-colors px-3 py-1.5 rounded-xl",
          saved
            ? "text-primary hover:text-primary/80 hover:bg-primary/5"
            : "text-muted-foreground hover:text-primary hover:bg-primary/5",
          className
        )}
        title={saved ? "إلغاء الحفظ" : "حفظ"}
      >
        <Bookmark className={cn("w-4 h-4", saved && "fill-primary")} />
        {saved ? "محفوظ" : "حفظ"}
      </button>
    );
  }

  return (
    <Button
      variant="outline"
      className={cn("gap-2 rounded-xl", saved && "border-primary text-primary", className)}
      onClick={() => toggleSave(type, id)}
      disabled={isLoading}
    >
      <Bookmark className={cn("w-4 h-4", saved && "fill-primary")} />
      {saved ? "محفوظ" : "حفظ"}
    </Button>
  );
}
