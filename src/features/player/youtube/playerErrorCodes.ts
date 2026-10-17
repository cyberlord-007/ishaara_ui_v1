import type { KnownErrorCode } from "@/lib/api/errors";

/**
 * Maps a YouTube IFrame Player API `onError` numeric code to this app's own
 * error vocabulary, so `toUserMessage()` can render it like any backend error.
 * @param code the `data` passed to the player's `onError` event
 */
export function mapYouTubePlayerErrorCode(code: number): KnownErrorCode {
  switch (code) {
    case 100:
      return "video_not_found";
    case 101:
    case 150:
      return "video_not_embeddable";
    default:
      return "unknown_error";
  }
}
