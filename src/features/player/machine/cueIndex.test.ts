import { describe, expect, it } from "vitest";
import type { NarrationCue } from "@/lib/api/schemas";
import { cuesBetween, findNextCue } from "./cueIndex";

function makeCue(cueId: string, startSeconds: number): NarrationCue {
  return {
    cueId,
    startSeconds,
    spokenPhrase: "this",
    referentKind: "text",
    boardDescription: "",
    gapSummary: "",
    narrationText: "",
    audioUrl: null,
    audioDurationSeconds: null,
    confidence: 1,
  };
}

describe("findNextCue", () => {
  it("returns the first cue at or after the given time", () => {
    const cues = [makeCue("a", 10), makeCue("b", 40)];
    expect(findNextCue(cues, 20)).toBe(1);
  });

  it("collapses a run of cues within the cluster window to the last one", () => {
    const cues = [
      makeCue("a", 10),
      makeCue("b", 10.2),
      makeCue("c", 10.25),
      makeCue("d", 40),
    ];
    expect(findNextCue(cues, 0)).toBe(2);
  });

  it("does not collapse cues outside the cluster window", () => {
    const cues = [makeCue("a", 10), makeCue("b", 10.5)];
    expect(findNextCue(cues, 0)).toBe(0);
  });

  it("returns cues.length when nothing is left to arm (?t= past the last cue)", () => {
    const cues = [makeCue("a", 10), makeCue("b", 40)];
    expect(findNextCue(cues, 100)).toBe(2);
    expect(cues[findNextCue(cues, 100)]).toBeUndefined();
  });

  it("returns 0 for an empty cue list", () => {
    expect(findNextCue([], 0)).toBe(0);
  });

  it("includes a cue exactly at the boundary", () => {
    const cues = [makeCue("a", 10)];
    expect(findNextCue(cues, 10)).toBe(0);
  });
});

describe("cuesBetween", () => {
  it("returns cues in the half-open range [from, to)", () => {
    const cues = [makeCue("a", 10), makeCue("b", 20), makeCue("c", 30)];
    expect(cuesBetween(cues, 10, 30).map((cue) => cue.cueId)).toEqual([
      "a",
      "b",
    ]);
  });

  it("returns an empty array when nothing is in range", () => {
    const cues = [makeCue("a", 10)];
    expect(cuesBetween(cues, 20, 30)).toEqual([]);
  });
});
