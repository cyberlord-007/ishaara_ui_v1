import { describe, expect, it } from "vitest";
import { VideoKey } from "@/lib/api/schemas";
import { parseVideoKey } from "@/lib/videoKey";

describe("parseVideoKey", () => {
  it("recovers the YouTube id, language and pipeline version", () => {
    const videoKey = VideoKey.parse("v8kBd64_WAc_en_v2");
    expect(parseVideoKey(videoKey)).toEqual({
      youtubeVideoId: "v8kBd64_WAc",
      narrationLanguage: "en",
      pipelineVersion: 2,
    });
  });

  it("recovers a Hindi key", () => {
    const videoKey = VideoKey.parse("abcdefghijk_hi_v10");
    expect(parseVideoKey(videoKey)).toEqual({
      youtubeVideoId: "abcdefghijk",
      narrationLanguage: "hi",
      pipelineVersion: 10,
    });
  });
});
