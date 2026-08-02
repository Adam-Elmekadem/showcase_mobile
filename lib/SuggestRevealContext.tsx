import React, { createContext, useContext, useMemo, useRef, useState } from "react";
import { Pressable } from "react-native";

type SuggestRevealContextValue = {
  activeId: string | null;
  setActiveId: (updater: string | null | ((current: string | null) => string | null)) => void;
};

const SuggestRevealContext = createContext<SuggestRevealContextValue | null>(null);

// Wraps the whole app (see app/_layout.tsx) so that revealing a card's
// long-press "send" overlay anywhere closes any other one already open, and
// tapping anywhere outside the open card dismisses it immediately — instead
// of only reacting to taps that land on the card's own backdrop, which left
// a real dead zone (the rest of the screen) where the overlay just sat
// there until a timeout fallback fired. The wrapping Pressable only ever
// intercepts a touch that no nested card/button already claimed, so normal
// taps, scrolling, and gestures elsewhere in the app are unaffected.
export function SuggestRevealProvider({ children }: { children: React.ReactNode }) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const value = useMemo(() => ({ activeId, setActiveId }), [activeId]);
  return (
    <SuggestRevealContext.Provider value={value}>
      <Pressable style={{ flex: 1 }} onPress={() => setActiveId(null)}>
        {children}
      </Pressable>
    </SuggestRevealContext.Provider>
  );
}

// Safety net only — covers the rare case a touch never bubbles to the root
// dismiss layer (e.g. a native pan gesture claiming it first). Not the
// primary dismiss path anymore, so it can afford to be generous.
const FALLBACK_DISMISS_MS = 4000;

/**
 * Drives the long-press "send" icon reveal used on film/showcase cards.
 * Only one card's overlay can be visible app-wide at a time; the root
 * SuggestRevealProvider wrapper closes it on any outside tap.
 */
export function useSuggestReveal() {
  const context = useContext(SuggestRevealContext);
  if (!context) throw new Error("useSuggestReveal must be used within a SuggestRevealProvider");
  const ctx = context;
  const idRef = useRef<string | undefined>(undefined);
  if (!idRef.current) idRef.current = `sr_${Math.random().toString(36).slice(2)}`;
  const id = idRef.current;
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const visible = ctx.activeId === id;

  function reveal() {
    ctx.setActiveId(id);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      ctx.setActiveId((current) => (current === id ? null : current));
    }, FALLBACK_DISMISS_MS);
  }

  function dismiss() {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    ctx.setActiveId((current) => (current === id ? null : current));
  }

  return { visible, reveal, dismiss };
}
