import { describe, expect, it } from "vitest";
import { ErrorCode, ProblemDetailsSchema, toUserMessage } from "./errors";

describe("ProblemDetailsSchema", () => {
  it("parses an RFC 9457 problem+json body", () => {
    const result = ProblemDetailsSchema.safeParse({
      type: "https://ishaara.app/errors/video_too_long",
      title: "video_too_long",
      status: 422,
      detail: "This lecture is 52 minutes long; the limit is 45 minutes.",
      code: "video_too_long",
    });
    expect(result.success).toBe(true);
  });

  it("allows detail to be omitted", () => {
    const result = ProblemDetailsSchema.safeParse({
      type: "https://ishaara.app/errors/unknown_error",
      title: "unknown_error",
      status: 500,
      code: "unknown_error",
    });
    expect(result.success).toBe(true);
  });
});

describe("toUserMessage", () => {
  it.each(
    ErrorCode.options,
  )("returns a message and a next step for %s", (code) => {
    const result = toUserMessage(code);
    expect(result.message.length).toBeGreaterThan(0);
    expect(result.nextStep.length).toBeGreaterThan(0);
  });

  it("returns a message and a next step for network_error", () => {
    const result = toUserMessage("network_error");
    expect(result.message).toBe("Ishaara can't reach the server.");
  });

  it("returns a message and a next step for unknown_error", () => {
    const result = toUserMessage("unknown_error");
    expect(result.message).toBe("Something went wrong on our side.");
  });

  it("includes the parsed minute count for video_too_long", () => {
    const result = toUserMessage(
      "video_too_long",
      "This lecture is 52 minutes long, which is over the 45 minute limit.",
    );
    expect(result.message).toBe(
      "This video is 52 minutes long. The limit is 45 minutes.",
    );
  });

  it("drops the number for video_too_long when detail has none", () => {
    const result = toUserMessage("video_too_long", undefined);
    expect(result.message).toBe(
      "This video is longer than the limit. The limit is 45 minutes.",
    );
  });
});
