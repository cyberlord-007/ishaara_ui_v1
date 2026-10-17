export type GreetingPeriod = "morning" | "afternoon" | "evening" | "default";

/**
 * Buckets a local hour into a greeting period, so the UI can say "Good
 * morning" etc. without any external greeting library.
 * @param hour the local hour, 0-23
 */
export function getGreetingPeriod(hour: number): GreetingPeriod {
  if (hour >= 5 && hour < 12) {
    return "morning";
  }
  if (hour >= 12 && hour < 17) {
    return "afternoon";
  }
  if (hour >= 17 && hour < 21) {
    return "evening";
  }
  return "default";
}

/**
 * @param totalSeconds a video's duration, in seconds
 * @returns a spoken-friendly duration in whole minutes, e.g. "42 minutes" or "1 minute"
 */
export function formatSpokenDuration(totalSeconds: number): string {
  const minutes = Math.max(1, Math.round(totalSeconds / 60));
  return `${minutes} minute${minutes === 1 ? "" : "s"}`;
}

/**
 * A clock-face time for the player's current-time display (tabular-nums).
 * @param totalSeconds playback position or duration, in seconds
 * @returns "m:ss", or "h:mm:ss" once the hour mark is reached
 */
export function formatClock(totalSeconds: number): string {
  const wholeSeconds = Math.max(0, Math.round(totalSeconds));
  const hours = Math.floor(wholeSeconds / 3600);
  const minutes = Math.floor((wholeSeconds % 3600) / 60);
  const seconds = wholeSeconds % 60;
  const paddedSeconds = String(seconds).padStart(2, "0");

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, "0")}:${paddedSeconds}`;
  }
  return `${minutes}:${paddedSeconds}`;
}
