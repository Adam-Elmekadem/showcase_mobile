import React, { createContext, useContext, useState, useCallback, useMemo } from "react";

export type Language = "ar" | "en";

type LocaleContextValue = {
  language: Language;
  setLanguage: (language: Language) => void;
  toggleLanguage: () => void;
  isRTL: boolean;
};

const LocaleContext = createContext<LocaleContextValue | null>(null);

export function LocaleProvider({ children, initialLanguage = "ar" }: { children: React.ReactNode; initialLanguage?: Language }) {
  const [language, setLanguage] = useState<Language>(initialLanguage);

  const toggleLanguage = useCallback(() => {
    setLanguage((value) => (value === "ar" ? "en" : "ar"));
  }, []);

  const value = useMemo(
    () => ({ language, setLanguage, toggleLanguage, isRTL: language === "ar" }),
    [language, toggleLanguage]
  );

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale() {
  const context = useContext(LocaleContext);
  if (!context) throw new Error("useLocale must be used inside LocaleProvider");
  return context;
}

export function pick<T>(language: Language, ar: T, en: T): T {
  return language === "ar" ? ar : en;
}
