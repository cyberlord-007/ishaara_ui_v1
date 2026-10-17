import { describe, expect, it } from "vitest";
import { VideoKey } from "@/lib/api/schemas";
import { linkifyBoardMarkers } from "./notesHtml";

describe("linkifyBoardMarkers", () => {
  const videoKey = VideoKey.parse("v8kBd64_WAc_en_v2");

  it("turns a single marker into a link back to Watch at that time", () => {
    const html = "<p><strong>[Board, 00:23]</strong> A circle is drawn.</p>";
    expect(linkifyBoardMarkers(html, videoKey)).toBe(
      '<p><a href="/watch?v=v8kBd64_WAc_en_v2&t=23">[Board, 00:23]</a> A circle is drawn.</p>',
    );
  });

  it("converts minutes and seconds to a total-seconds offset", () => {
    const html = "<strong>[Board, 02:42]</strong>";
    expect(linkifyBoardMarkers(html, videoKey)).toBe(
      '<a href="/watch?v=v8kBd64_WAc_en_v2&t=162">[Board, 02:42]</a>',
    );
  });

  it("handles multiple markers in the same document", () => {
    const html =
      "<strong>[Board, 00:23]</strong><strong>[Board, 01:05]</strong>";
    expect(linkifyBoardMarkers(html, videoKey)).toBe(
      '<a href="/watch?v=v8kBd64_WAc_en_v2&t=23">[Board, 00:23]</a>' +
        '<a href="/watch?v=v8kBd64_WAc_en_v2&t=65">[Board, 01:05]</a>',
    );
  });

  it("leaves text with no markers unchanged", () => {
    const html = "<h1>Title</h1><p>No board references here.</p>";
    expect(linkifyBoardMarkers(html, videoKey)).toBe(html);
  });
});
