import { useRef, useEffect, useCallback } from "react";

/**
 * Makes a text input safe for Android WebView / Capacitor Arabic IME.
 *
 * Problem: React's controlled inputs (value={state}) re-render on every
 * keystroke and reset the DOM value, which confuses the Android IME and
 * causes Arabic text to disappear or "fly away".
 *
 * Solution: Keep the input uncontrolled (no value= prop). Sync external
 * value changes to the DOM only when the input is not focused. Debounce
 * state updates so React doesn't re-render during IME composition.
 *
 * Usage:
 *   const { ref, bind } = useAndroidInput(value, onChange, 150);
 *   <input ref={ref} defaultValue={value} {...bind} />
 *
 * To programmatically clear: ref.current.value = ""; onChange("");
 */
export function useAndroidInput(
  value: string,
  onChange: (v: string) => void,
  debounceMs = 150,
) {
  const ref = useRef<HTMLInputElement | HTMLTextAreaElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isFocused = useRef(false);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  // Sync external value changes → DOM only when input is NOT focused
  useEffect(() => {
    if (ref.current && !isFocused.current) {
      ref.current.value = value;
    }
  }, [value]);

  const flush = useCallback((v: string) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    onChangeRef.current(v);
  }, []);

  const handleInput = useCallback(
    (e: React.FormEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const v = (e.target as HTMLInputElement).value;
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => onChangeRef.current(v), debounceMs);
    },
    [debounceMs],
  );

  const handleFocus = useCallback(() => {
    isFocused.current = true;
  }, []);

  const handleBlur = useCallback(
    (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      isFocused.current = false;
      flush((e.target as HTMLInputElement).value);
    },
    [flush],
  );

  return {
    ref,
    bind: {
      onInput: handleInput,
      onFocus: handleFocus,
      onBlur: handleBlur,
    },
    flush,
  };
}
