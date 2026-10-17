import type { NarrationCue } from "@/lib/api/schemas";

/**
 * Finds the cue to arm after a seek or jump to `afterSeconds`. If several
 * cues start within `clusterWindowSeconds` of each other, only the last one
 * in that run is armed — the others are treated as already passed.
 * @returns the index into `cues`, or `cues.length` if nothing is left to arm
 * (always safe to index — `cues[result]` is `undefined`, never a crash)
 */
export function findNextCue(
  cues: readonly NarrationCue[],
  afterSeconds: number,
  clusterWindowSeconds = 0.3,
): number {
  const first = cues.findIndex((cue) => cue.startSeconds >= afterSeconds);
  if (first === -1) {
    return cues.length;
  }

  let index = first;
  while (index + 1 < cues.length) {
    const current = cues[index];
    const next = cues[index + 1];
    if (
      !current ||
      !next ||
      next.startSeconds - current.startSeconds >= clusterWindowSeconds
    ) {
      break;
    }
    index += 1;
  }
  return index;
}

/** Cues with `startSeconds` in the half-open range `[fromSeconds, toSeconds)`. */
export function cuesBetween(
  cues: readonly NarrationCue[],
  fromSeconds: number,
  toSeconds: number,
): readonly NarrationCue[] {
  return cues.filter(
    (cue) => cue.startSeconds >= fromSeconds && cue.startSeconds < toSeconds,
  );
}
