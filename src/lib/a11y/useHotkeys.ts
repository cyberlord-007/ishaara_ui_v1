"use client";

import { useEffect } from "react";
import { usePreferencesStore } from "@/stores/preferencesStore";

export type HotkeyMap = Record<string, (event: KeyboardEvent) => void>;

const TYPING_TAGS = new Set(["INPUT", "TEXTAREA", "SELECT"]);

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) {
    return false;
  }
  return TYPING_TAGS.has(target.tagName) || target.isContentEditable;
}

function normalizeKey(event: KeyboardEvent): string {
  return event.key === " " ? "space" : event.key.toLowerCase();
}

/**
 * Registers single-key shortcuts (lowercase keys in `map`, `"space"` for the
 * spacebar). Inactive while focus is in a text field, and disabled entirely
 * when the user has turned shortcuts off in Settings (WCAG 2.1.4) — `Escape`
 * isn't handled here since React Aria's `Dialog`/`Modal` already closes and
 * restores focus on it.
 */
export function useHotkeys(map: HotkeyMap): void {
  const singleKeyShortcuts = usePreferencesStore(
    (state) => state.singleKeyShortcuts,
  );

  useEffect(() => {
    if (!singleKeyShortcuts) {
      return;
    }

    function onKeyDown(event: KeyboardEvent): void {
      if (isTypingTarget(event.target)) {
        return;
      }
      const handler = map[normalizeKey(event)];
      if (handler) {
        event.preventDefault();
        handler(event);
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [singleKeyShortcuts, map]);
}
