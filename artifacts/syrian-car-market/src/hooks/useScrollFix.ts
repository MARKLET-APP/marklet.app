import { useEffect } from "react";

export function useScrollFix() {
  useEffect(() => {
    const el = document.getElementById("app-main");
    if (!el) return;

    el.scrollTop = 0;
  }, []);
}
