/**
 * Module-level toast with a stable timer.
 *
 * showToast() can be called from anywhere — event handlers, API callbacks,
 * auth store — without depending on the React render cycle.
 *
 * Calling showToast() again before the previous one expires cancels the old
 * timer and shows the new message immediately (no stacking).
 */
import { toast as _toast } from "@/hooks/use-toast";

let _dismissFn: (() => void) | null = null;
let _timer: ReturnType<typeof setTimeout> | null = null;

export function showToast(
  msg: string,
  opts?: {
    description?: string;
    variant?: "default" | "destructive";
    duration?: number;
  }
) {
  // Clear any pending auto-dismiss from the previous toast
  if (_timer) { clearTimeout(_timer); _timer = null; }
  if (_dismissFn) { _dismissFn(); _dismissFn = null; }

  const duration = opts?.duration ?? 3000;
  const { dismiss } = _toast({
    title: msg,
    description: opts?.description,
    variant: opts?.variant,
  });

  _dismissFn = dismiss;
  _timer = setTimeout(() => {
    dismiss();
    _dismissFn = null;
    _timer = null;
  }, duration);
}

// Re-export the raw toast for components that already use it directly
export { _toast as toast };
