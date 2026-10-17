import { describe, expect, it } from "vitest";
import { mapYouTubePlayerErrorCode } from "./playerErrorCodes";

describe("mapYouTubePlayerErrorCode", () => {
  it.each([
    [2, "unknown_error"],
    [5, "unknown_error"],
    [100, "video_not_found"],
    [101, "video_not_embeddable"],
    [150, "video_not_embeddable"],
    [999, "unknown_error"],
  ] as const)("maps code %i to %s", (code, expected) => {
    expect(mapYouTubePlayerErrorCode(code)).toBe(expected);
  });
});
