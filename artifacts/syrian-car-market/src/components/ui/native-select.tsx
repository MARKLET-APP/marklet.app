import * as React from "react";
import { cn } from "@/lib/utils";

interface NativeSelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  onValueChange?: (value: string) => void;
  placeholder?: string;
}

const NativeSelect = React.forwardRef<HTMLSelectElement, NativeSelectProps>(
  ({ className, onValueChange, onChange, children, placeholder, value, ...props }, ref) => {
    return (
      <div className="relative w-full">
        <select
          ref={ref}
          value={value ?? ""}
          onChange={(e) => {
            onValueChange?.(e.target.value);
            onChange?.(e);
          }}
          style={{ fontSize: 16 }}
          className={cn(
            "w-full appearance-none rounded-md border border-input bg-background",
            "px-3 py-2 text-sm ring-offset-background",
            "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
            "disabled:cursor-not-allowed disabled:opacity-50",
            "h-10 pr-8 text-right",
            className
          )}
          {...props}
        >
          {placeholder && (
            <option value="" disabled hidden>
              {placeholder}
            </option>
          )}
          {children}
        </select>
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
          ▾
        </span>
      </div>
    );
  }
);
NativeSelect.displayName = "NativeSelect";

export { NativeSelect };
