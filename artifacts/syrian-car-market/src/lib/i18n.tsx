import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { getTranslation, Lang } from "./translations";

interface LangContext {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: string) => string;
  dir: "rtl" | "ltr";
  isRTL: boolean;
}

const LanguageContext = createContext<LangContext>({
  lang: "ar",
  setLang: () => {},
  t: (k) => k,
  dir: "rtl",
  isRTL: true,
});

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() => {
    try {
      const saved = localStorage.getItem("marklet_lang");
      if (saved === "ar" || saved === "en") return saved;
    } catch {}
    return "ar";
  });

  const setLang = (l: Lang) => {
    setLangState(l);
    try { localStorage.setItem("marklet_lang", l); } catch {}
  };

  const isRTL = lang === "ar";
  const dir = isRTL ? "rtl" : "ltr";

  useEffect(() => {
    document.documentElement.setAttribute("dir", dir);
    document.documentElement.setAttribute("lang", lang);
    document.documentElement.style.fontFamily = isRTL
      ? "'Noto Sans Arabic', sans-serif"
      : "Inter, sans-serif";
  }, [lang, dir, isRTL]);

  const t = (key: string) => getTranslation(lang, key);

  return (
    <LanguageContext.Provider value={{ lang, setLang, t, dir, isRTL }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}
