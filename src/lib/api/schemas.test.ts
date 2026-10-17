import { describe, expect, it } from "vitest";
import cuesFixture from "../../../tests/fixtures/cues.json";
import historyFixture from "../../../tests/fixtures/history.json";
import questionAnswerFixture from "../../../tests/fixtures/questionAnswer.json";
import videoStatusProcessingFixture from "../../../tests/fixtures/videoStatusProcessing.json";
import videoStatusReadyFixture from "../../../tests/fixtures/videoStatusReady.json";
import {
  AskQuestionRequest,
  CuesResponseSchema,
  HistoryResponseSchema,
  QuestionAnswerSchema,
  SubmitVideoRequest,
  VideoKey,
  VideoStatusResponseSchema,
} from "./schemas";

describe("VideoKey", () => {
  it("accepts a well-formed key", () => {
    expect(VideoKey.safeParse("dQw4w9WgXcQ_en_v1").success).toBe(true);
  });

  it("rejects a key missing the language or version suffix", () => {
    expect(VideoKey.safeParse("dQw4w9WgXcQ").success).toBe(false);
  });
});

describe("VideoStatusResponseSchema", () => {
  it("parses a ready fixture", () => {
    const result = VideoStatusResponseSchema.parse(videoStatusReadyFixture);
    expect(result.status).toBe("ready");
    expect(result.stage).toBeNull();
  });

  it("parses a processing fixture", () => {
    const result = VideoStatusResponseSchema.parse(
      videoStatusProcessingFixture,
    );
    expect(result.status).toBe("processing");
    expect(result.stage).toBe("writing");
    expect(result.progress_percent).toBe(60);
  });
});

describe("CuesResponseSchema", () => {
  it("parses cues and maps snake_case to camelCase", () => {
    const result = CuesResponseSchema.parse(cuesFixture);
    expect(result.cues).toHaveLength(2);
    expect(result.cues[0]).toMatchObject({
      cueId: "cue_001",
      startSeconds: 42.5,
      referentKind: "diagram",
      audioUrl:
        "https://storage.googleapis.com/ishaara/dQw4w9WgXcQ_en_v1/cue_001.wav",
    });
    expect(result.cues[1]?.audioUrl).toBeNull();
  });
});

describe("HistoryResponseSchema", () => {
  it("parses a history fixture with mixed languages and statuses", () => {
    const result = HistoryResponseSchema.parse(historyFixture);
    expect(result.videos).toHaveLength(2);
    expect(result.videos[1]?.narration_language).toBe("hi");
  });
});

describe("QuestionAnswerSchema", () => {
  it("parses an answer and maps snake_case to camelCase", () => {
    const result = QuestionAnswerSchema.parse(questionAnswerFixture);
    expect(result.answerText).toBe(questionAnswerFixture.answer_text);
    expect(result.referencedSeconds).toEqual([128, 134.5]);
  });
});

describe("SubmitVideoRequest", () => {
  it("accepts a valid YouTube URL and language", () => {
    const result = SubmitVideoRequest.safeParse({
      youtube_url: "https://youtu.be/dQw4w9WgXcQ",
      narration_language: "hi",
    });
    expect(result.success).toBe(true);
  });

  it("rejects a URL that isn't a YouTube link", () => {
    const result = SubmitVideoRequest.safeParse({
      youtube_url: "https://vimeo.com/123456789",
      narration_language: "en",
    });
    expect(result.success).toBe(false);
  });
});

describe("AskQuestionRequest", () => {
  it("accepts a question with a timestamp", () => {
    const result = AskQuestionRequest.safeParse({
      question: "What was on the board just now?",
      at_seconds: 128,
    });
    expect(result.success).toBe(true);
  });

  it("rejects a question that is too short", () => {
    const result = AskQuestionRequest.safeParse({
      question: "hi",
      at_seconds: null,
    });
    expect(result.success).toBe(false);
  });
});
