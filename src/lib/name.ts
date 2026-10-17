/**
 * @param displayName a Firebase Auth user's full display name, if set
 * @returns the first word of `displayName`, or `""` if it's empty or unset
 */
export function getFirstName(displayName: string | null | undefined): string {
  if (!displayName) {
    return "";
  }
  return displayName.trim().split(/\s+/)[0] ?? "";
}
