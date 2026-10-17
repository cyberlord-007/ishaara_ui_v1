import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { NarrationLanguage } from "@/lib/api/schemas";

/** Persisted in localStorage by Zustand; never sent to the backend. */
export interface Preferences {
  narrationLanguage: NarrationLanguage;
  interfaceLanguage: "en" | "hi";
  narrationRate: 0.75 | 1 | 1.25 | 1.5;
  autoPauseForCues: boolean;
  playEarcons: boolean;
  narrationOutput: "audio" | "screen_reader";
  textScale: 1 | 1.25 | 1.5;
  theme: "system" | "light" | "dark" | "high-contrast";
  reducedMotion: "system" | "reduce";
  singleKeyShortcuts: boolean;
}

export const defaultPreferences: Preferences = {
  narrationLanguage: "en",
  interfaceLanguage: "en",
  narrationRate: 1,
  autoPauseForCues: true,
  playEarcons: true,
  narrationOutput: "audio",
  textScale: 1,
  theme: "system",
  reducedMotion: "system",
  singleKeyShortcuts: true,
};

interface PreferencesStore extends Preferences {
  setPreference: <K extends keyof Preferences>(
    key: K,
    value: Preferences[K],
  ) => void;
  reset: () => void;
}

/** Runs when a persisted store written by an older `version` is loaded. */
function migratePreferences(persisted: unknown): Preferences {
  return { ...defaultPreferences, ...(persisted as Partial<Preferences>) };
}

export const usePreferencesStore = create<PreferencesStore>()(
  persist(
    (set) => ({
      ...defaultPreferences,
      setPreference: (key, value) => set({ [key]: value }),
      reset: () => set(defaultPreferences),
    }),
    {
      name: "ishaara-preferences",
      version: 1,
      migrate: migratePreferences,
      // Server and first client render must agree (static export has no per-request
      // state), so hydration from localStorage is deferred to an explicit rehydrate()
      // call after mount — see providers/PreferencesEffects.tsx.
      skipHydration: true,
    },
  ),
);
