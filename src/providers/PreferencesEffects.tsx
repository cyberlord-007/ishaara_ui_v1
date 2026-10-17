"use client";

import { useEffect } from "react";
import { usePreferencesStore } from "@/stores/preferencesStore";

/**
 * Rehydrates the preferences store from `localStorage` after mount (deferred
 * so the server and first client render agree), then keeps `theme`,
 * `textScale`, `reducedMotion` and `interfaceLanguage` applied to
 * `<html>`. Renders nothing.
 */
export function PreferencesEffects() {
  const theme = usePreferencesStore((state) => state.theme);
  const textScale = usePreferencesStore((state) => state.textScale);
  const reducedMotion = usePreferencesStore((state) => state.reducedMotion);
  const interfaceLanguage = usePreferencesStore(
    (state) => state.interfaceLanguage,
  );

  useEffect(() => {
    usePreferencesStore.persist.rehydrate();
  }, []);

  useEffect(() => {
    if (theme === "system") {
      document.documentElement.removeAttribute("data-theme");
    } else {
      document.documentElement.setAttribute("data-theme", theme);
    }
  }, [theme]);

  useEffect(() => {
    document.documentElement.style.setProperty(
      "--user-text-scale",
      String(textScale),
    );
  }, [textScale]);

  useEffect(() => {
    if (reducedMotion === "reduce") {
      document.documentElement.style.setProperty("--motion-duration", "0ms");
    } else {
      document.documentElement.style.removeProperty("--motion-duration");
    }
  }, [reducedMotion]);

  useEffect(() => {
    document.documentElement.lang = interfaceLanguage;
  }, [interfaceLanguage]);

  return null;
}
