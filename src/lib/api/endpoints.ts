import { env } from "@/env";
import { apiRequest, apiRequestText } from "@/lib/api/client";
import {
  type AskQuestionRequest,
  CuesResponseSchema,
  HistoryResponseSchema,
  QuestionAnswerSchema,
  type SubmitVideoRequest,
  type VideoKey,
  VideoStatusResponseSchema,
} from "@/lib/api/schemas";

/** `POST /v1/videos`. `200` means the video was already processed; `202` means it was queued. */
export function submitVideo(request: SubmitVideoRequest) {
  return apiRequest("/v1/videos", {
    method: "POST",
    body: request,
    schema: VideoStatusResponseSchema,
  });
}

/** `GET /v1/videos/{video_key}`. */
export function getVideoStatus(videoKey: VideoKey) {
  return apiRequest(`/v1/videos/${videoKey}`, {
    schema: VideoStatusResponseSchema,
  });
}

/** `GET /v1/videos/{video_key}/cues`. Only meaningful once `status` is `ready`. */
export function getCues(videoKey: VideoKey) {
  return apiRequest(`/v1/videos/${videoKey}/cues`, {
    schema: CuesResponseSchema,
  });
}

/** `GET /v1/videos/{video_key}/cues.vtt`, as a URL for a `<track>` element, never fetched directly. */
export function getCuesVttUrl(videoKey: VideoKey): string {
  return `${env.NEXT_PUBLIC_API_BASE_URL}/v1/videos/${videoKey}/cues.vtt`;
}

/** `GET /v1/videos/{video_key}/notes?format=html`. Caller sanitises with DOMPurify before render. */
export function getNotesHtml(videoKey: VideoKey) {
  return apiRequestText(`/v1/videos/${videoKey}/notes?format=html`);
}

/** `POST /v1/videos/{video_key}/questions`. */
export function askQuestion(videoKey: VideoKey, request: AskQuestionRequest) {
  return apiRequest(`/v1/videos/${videoKey}/questions`, {
    method: "POST",
    body: request,
    schema: QuestionAnswerSchema,
  });
}

/** `GET /v1/me/videos`. */
export function getHistory() {
  return apiRequest("/v1/me/videos", { schema: HistoryResponseSchema });
}
