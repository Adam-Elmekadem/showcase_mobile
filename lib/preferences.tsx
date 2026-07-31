import React, { createContext, useContext, useState, useMemo } from "react";

export type SwipeDetailStyle = "morph" | "sheet";

type PreferencesContextValue = {
  swipeDetailStyle: SwipeDetailStyle;
  setSwipeDetailStyle: (style: SwipeDetailStyle) => void;
};

const PreferencesContext = createContext<PreferencesContextValue | null>(null);

export function PreferencesProvider({ children }: { children: React.ReactNode }) {
  const [swipeDetailStyle, setSwipeDetailStyle] = useState<SwipeDetailStyle>("morph");

  const value = useMemo(() => ({ swipeDetailStyle, setSwipeDetailStyle }), [swipeDetailStyle]);

  return <PreferencesContext.Provider value={value}>{children}</PreferencesContext.Provider>;
}

export function usePreferences() {
  const context = useContext(PreferencesContext);
  if (!context) throw new Error("usePreferences must be used within a PreferencesProvider");
  return context;
}
