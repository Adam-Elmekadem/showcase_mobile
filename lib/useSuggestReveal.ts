import { useEffect, useRef, useState } from "react";

const AUTO_DISMISS_MS = 2500;

/**
 * Drives the long-press "send" icon reveal used on film/showcase cards.
 * Auto-dismisses after a few seconds rather than staying stuck visible --
 * there's no reliable "tapped anywhere else in the app" signal available
 * without wrapping the whole app in its own gesture-catching layer, and a
 * short timeout gets the same practical result (it doesn't linger) far
 * more simply.
 */
export function useSuggestReveal() {
  const [visible, setVisible] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function reveal() {
    setVisible(true);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => setVisible(false), AUTO_DISMISS_MS);
  }

  function dismiss() {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setVisible(false);
  }

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  return { visible, reveal, dismiss };
}
