import * as React from "react";
import { ChevronDown, Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface BottomSheetOption {
  value: string;
  label: string;
}

interface BottomSheetSelectProps {
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  children?: React.ReactNode;
}

function parseOptions(children: React.ReactNode): BottomSheetOption[] {
  const opts: BottomSheetOption[] = [];
  React.Children.forEach(children, (child) => {
    if (React.isValidElement(child) && child.type === "option") {
      const props = child.props as { value?: string; children?: React.ReactNode };
      const val = props.value ?? "";
      const label = typeof props.children === "string" ? props.children : String(props.children ?? val);
      opts.push({ value: val, label });
    }
  });
  return opts;
}

export function BottomSheetSelect({
  value,
  onValueChange,
  placeholder,
  className,
  children,
}: BottomSheetSelectProps) {
  const [open, setOpen] = React.useState(false);
  const options = parseOptions(children);
  const selected = options.find((o) => o.value === value);
  const displayLabel = selected?.label ?? placeholder ?? "اختر";

  const openSheet = () => {
    document.body.style.overflow = "hidden";
    setOpen(true);
  };

  const closeSheet = () => {
    document.body.style.overflow = "";
    setOpen(false);
  };

  const handleSelect = (val: string) => {
    onValueChange(val);
    closeSheet();
  };

  React.useEffect(() => {
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  return (
    <>
      <button
        type="button"
        onClick={openSheet}
        className={cn(
          "flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background",
          "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
          "disabled:cursor-not-allowed disabled:opacity-50",
          !selected && "text-muted-foreground",
          className
        )}
      >
        <span className="truncate">{displayLabel}</span>
        <ChevronDown className="h-4 w-4 shrink-0 opacity-50 mr-2" />
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[200]"
          style={{ touchAction: "none" }}
        >
          <div
            className="absolute inset-0 bg-black/60"
            onClick={closeSheet}
          />
          <div
            className="absolute bottom-0 left-0 right-0 bg-background rounded-t-2xl shadow-2xl"
            style={{ maxHeight: "65vh", display: "flex", flexDirection: "column" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 py-3 border-b shrink-0">
              <span className="font-bold text-base">{placeholder ?? "اختر خياراً"}</span>
              <button
                type="button"
                onClick={closeSheet}
                className="text-muted-foreground text-sm hover:text-foreground"
              >
                إغلاق
              </button>
            </div>
            <div
              className="overflow-y-auto"
              style={{ WebkitOverflowScrolling: "touch", overscrollBehavior: "contain" }}
            >
              {options.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => handleSelect(opt.value)}
                  className={cn(
                    "flex w-full items-center justify-between px-4 py-3 text-sm border-b border-border/40",
                    "hover:bg-muted/50 active:bg-muted transition-colors",
                    opt.value === value && "text-primary font-semibold bg-primary/5"
                  )}
                >
                  <span>{opt.label}</span>
                  {opt.value === value && <Check className="w-4 h-4 text-primary shrink-0" />}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
