import { useCallback, useState } from "react";

const ARABIC_RE = /[\u0600-\u06FF]/;

export function useAutoDir(initial = "") {
  const [dir, setDir] = useState<"rtl" | "ltr">(() =>
    ARABIC_RE.test(initial.trimStart()[0] ?? "") ? "rtl" : "ltr"
  );

  const onInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const val = e.target.value.trimStart();
      if (!val) { setDir("rtl"); return; }
      setDir(ARABIC_RE.test(val[0]) ? "rtl" : "ltr");
    },
    []
  );

  return { dir, onInput };
}
