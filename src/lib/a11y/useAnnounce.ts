"use client";

import { useAnnouncerContext } from "@/providers/AnnouncerProvider";

/**
 * @returns `announce(message, politeness)`, which speaks `message` through
 * the app's one polite or assertive live region. Errors are always
 * `"assertive"`; everything else should be `"polite"`.
 */
export function useAnnounce() {
  return useAnnouncerContext().announce;
}
