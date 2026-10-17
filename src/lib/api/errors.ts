import { z } from "zod";

export const ErrorCode = z.enum([
  "invalid_token",
  "invalid_youtube_url",
  "invalid_request",
  "request_too_large",
  "video_not_public",
  "video_not_embeddable",
  "video_is_live",
  "video_too_long",
  "youtube_unavailable",
  "daily_limit_reached",
  "video_not_found",
  "video_not_ready",
]);
export type ErrorCode = z.infer<typeof ErrorCode>;

export const ProblemDetailsSchema = z.object({
  type: z.string(),
  title: z.string(),
  status: z.number().int(),
  detail: z.string().optional(),
  code: z.string(),
});
export type ProblemDetails = z.infer<typeof ProblemDetailsSchema>;

export type KnownErrorCode = ErrorCode | "network_error" | "unknown_error";

/** Narrows an arbitrary string (from a problem+json body, or a `VideoStatusResponse`) to a `KnownErrorCode`. */
export function toKnownErrorCode(
  code: string | null | undefined,
): KnownErrorCode {
  const options: readonly string[] = ErrorCode.options;
  return code && options.includes(code)
    ? (code as KnownErrorCode)
    : "unknown_error";
}

/** Thrown by `apiRequest` for every non-2xx response, timeout, and network failure. */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: KnownErrorCode,
    readonly detail: string | undefined,
  ) {
    super(code);
  }
}

interface UserMessage {
  message: string;
  nextStep: string;
}

function parseMinutes(detail: string | undefined): number | null {
  const match = detail ? /(\d+)/.exec(detail) : null;
  return match?.[1] ? Number.parseInt(match[1], 10) : null;
}

/**
 * Maps an `ApiError` code to the copy the UI shows: what happened, and what to do next.
 * @param code the error's `code`, or `"network_error"`/`"unknown_error"`
 * @param detail the problem details' `detail` field, used only for `video_too_long`
 * @returns a title and a next step; unrecognised codes fall back to a generic message
 */
export function toUserMessage(
  code: KnownErrorCode,
  detail?: string,
): UserMessage {
  switch (code) {
    case "invalid_youtube_url":
      return {
        message: "That doesn't look like a YouTube link.",
        nextStep: "Paste a link that starts with youtube.com or youtu.be",
      };
    case "invalid_request":
      return {
        message: "That didn't look right.",
        nextStep: "Check what you typed and try again",
      };
    case "request_too_large":
      return {
        message: "That's too much text.",
        nextStep: "Shorten it and try again",
      };
    case "youtube_unavailable":
      return {
        message: "YouTube didn't respond.",
        nextStep: "Try again in a minute",
      };
    case "video_not_public":
      return {
        message: "This video is private or unlisted, so it can't be described.",
        nextStep: "Choose a public video",
      };
    case "video_not_embeddable":
      return {
        message:
          "The owner of this video doesn't allow it to play on other sites.",
        nextStep: "Choose another video",
      };
    case "video_is_live":
      return {
        message: "Live streams can't be described yet.",
        nextStep: "Try again after the stream ends",
      };
    case "video_too_long": {
      const minutes = parseMinutes(detail);
      return {
        message:
          minutes !== null
            ? `This video is ${minutes} minutes long. The limit is 45 minutes.`
            : "This video is longer than the limit. The limit is 45 minutes.",
        nextStep: "Choose a shorter lecture",
      };
    }
    case "daily_limit_reached":
      return {
        message: "You've reached today's limit.",
        nextStep:
          "Your limit resets at midnight India time; your Library still works",
      };
    case "video_not_found":
      return {
        message: "We couldn't find this lecture.",
        nextStep: "Go to Library",
      };
    case "video_not_ready":
      return {
        message: "This lecture is still being prepared.",
        nextStep: "Go to the progress page",
      };
    case "invalid_token":
      return {
        message: "You've been signed out.",
        nextStep: "Sign in again",
      };
    case "network_error":
      return {
        message: "Ishaara can't reach the server.",
        nextStep: "Check your connection; it will retry",
      };
    default:
      return {
        message: "Something went wrong on our side.",
        nextStep: "Try again in a minute",
      };
  }
}
