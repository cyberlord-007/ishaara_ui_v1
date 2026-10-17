"use client";

import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useRef,
  useState,
} from "react";

type Politeness = "polite" | "assertive";

interface AnnouncerContextValue {
  announce: (message: string, politeness: Politeness) => void;
}

const AnnouncerContext = createContext<AnnouncerContextValue | null>(null);

const DEDUPE_WINDOW_MS = 2000;
/** Live regions must be cleared before re-announcing the same text so screen readers notice the change. */
const CLEAR_BEFORE_REANNOUNCE_MS = 50;

/**
 * Renders the app's two live regions (`role="status"` polite, `role="alert"`
 * assertive) and exposes `announce()` through context. Nothing else in the
 * app should create a live region. The same message is never announced
 * twice within 2 seconds.
 */
export function AnnouncerProvider({ children }: { children: ReactNode }) {
  const [politeMessage, setPoliteMessage] = useState("");
  const [assertiveMessage, setAssertiveMessage] = useState("");
  const lastAnnouncedAt = useRef(new Map<string, number>());

  const announce = useCallback((message: string, politeness: Politeness) => {
    const now = Date.now();
    const lastTime = lastAnnouncedAt.current.get(message) ?? 0;
    if (now - lastTime < DEDUPE_WINDOW_MS) {
      return;
    }
    lastAnnouncedAt.current.set(message, now);

    const setMessage =
      politeness === "assertive" ? setAssertiveMessage : setPoliteMessage;
    setMessage("");
    window.setTimeout(() => setMessage(message), CLEAR_BEFORE_REANNOUNCE_MS);
  }, []);

  return (
    <AnnouncerContext.Provider value={{ announce }}>
      {children}
      <output aria-live="polite" className="visually-hidden">
        {politeMessage}
      </output>
      <div role="alert" aria-live="assertive" className="visually-hidden">
        {assertiveMessage}
      </div>
    </AnnouncerContext.Provider>
  );
}

/** @throws {Error} if called outside an `AnnouncerProvider` */
export function useAnnouncerContext(): AnnouncerContextValue {
  const context = useContext(AnnouncerContext);
  if (!context) {
    throw new Error(
      "useAnnouncerContext must be used within an AnnouncerProvider",
    );
  }
  return context;
}
