import { describe, expect, it } from "vitest";
import { isParsableYouTubeUrl, parseYouTubeVideoId } from "./youtubeUrl";

const VIDEO_ID = "dQw4w9WgXcQ";

describe("parseYouTubeVideoId", () => {
  const validForms: ReadonlyArray<[string, string]> = [
    ["https://www.youtube.com/watch?v=dQw4w9WgXcQ", "standard watch URL"],
    ["http://youtube.com/watch?v=dQw4w9WgXcQ", "http, no www"],
    ["https://m.youtube.com/watch?v=dQw4w9WgXcQ", "mobile subdomain"],
    ["https://youtu.be/dQw4w9WgXcQ", "short youtu.be link"],
    ["https://www.youtube.com/embed/dQw4w9WgXcQ", "embed URL"],
    ["https://www.youtube.com/shorts/dQw4w9WgXcQ", "shorts URL"],
    [
      "https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=120s&list=PLabc",
      "watch URL with extra query params",
    ],
  ];

  it.each(validForms)("parses a valid form: %s (%s)", (url) => {
    expect(parseYouTubeVideoId(url)).toBe(VIDEO_ID);
  });

  const invalidForms: ReadonlyArray<[string, string]> = [
    ["https://vimeo.com/123456789", "non-YouTube domain"],
    ["not a url", "unparsable string"],
    ["https://www.youtube.com/watch", "missing video id"],
    ["https://youtu.be/short", "video id too short"],
    [
      "https://www.youtube.com/playlist?list=PLabc123",
      "playlist URL with no video id",
    ],
  ];

  it.each(invalidForms)("rejects an invalid form: %s (%s)", (url) => {
    expect(parseYouTubeVideoId(url)).toBeNull();
  });
});

describe("isParsableYouTubeUrl", () => {
  it("mirrors parseYouTubeVideoId", () => {
    expect(isParsableYouTubeUrl("https://youtu.be/dQw4w9WgXcQ")).toBe(true);
    expect(isParsableYouTubeUrl("https://vimeo.com/123456789")).toBe(false);
  });
});
