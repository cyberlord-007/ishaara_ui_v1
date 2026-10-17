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
