import type { VideoKey } from "@/lib/api/schemas";

const BOARD_MARKER_PATTERN = /<strong>\[Board, (\d{1,2}):(\d{2})\]<\/strong>/g;

/**
 * Turns `<strong>[Board, MM:SS]</strong>` markers in already-sanitized notes
 * HTML into links back to Watch at that moment. Run this *after*
 * `DOMPurify.sanitize()`, never before — the injected `<a href>` values are
 * always our own deterministically-computed string, never attacker-
 * influenced, so sanitizing afterwards can't strip anything and running
 * this first would just have its output sanitized away (or, worse, make it
 * look like the unsanitized input is safe to linkify).
 */
export function linkifyBoardMarkers(html: string, videoKey: VideoKey): string {
  return html.replace(
    BOARD_MARKER_PATTERN,
    (_match, minutes: string, seconds: string) => {
      const totalSeconds =
        Number.parseInt(minutes, 10) * 60 + Number.parseInt(seconds, 10);
      const href = `/watch?v=${videoKey}&t=${totalSeconds}`;
      return `<a href="${href}">[Board, ${minutes}:${seconds}]</a>`;
    },
  );
}
