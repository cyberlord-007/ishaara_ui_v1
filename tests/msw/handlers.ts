import { HttpResponse, http } from "msw";
import type { ErrorCode } from "@/lib/api/errors";
import type { PipelineStage } from "@/lib/api/schemas";

export const API_BASE_URL = "https://api.test.ishaara.app";

const STAGE_ORDER: readonly PipelineStage[] = [
  "resolving",
  "analyzing",
  "writing",
  "voicing",
  "saving",
];

/** Poll count per `video_key`, so a scripted job advances one stage per `GET` call. */
const pollCountByVideoKey = new Map<string, number>();

export function resetScriptedJobs(): void {
  pollCountByVideoKey.clear();
}

function buildStatusResponse(videoKey: string) {
  const pollCount = pollCountByVideoKey.get(videoKey) ?? 0;
  pollCountByVideoKey.set(videoKey, pollCount + 1);

  const stageIndex = Math.min(pollCount, STAGE_ORDER.length - 1);
  const isReady = pollCount >= STAGE_ORDER.length;

  return {
    video_key: videoKey,
    // channel_title intentionally omitted — the real backend doesn't send it yet
    // (see docs/backend-requests.md); it's an optional field in the schema.
    title: "Introduction to Thermodynamics",
    duration_seconds: 1800,
    status: isReady ? "ready" : "processing",
    stage: isReady ? null : STAGE_ORDER[stageIndex],
    progress_percent: isReady ? 100 : Math.min(99, (stageIndex + 1) * 20),
    error_code: null,
    error_message: null,
  };
}

const ERROR_FIXTURES: Record<ErrorCode, { status: number; detail: string }> = {
  invalid_token: { status: 401, detail: "The ID token is invalid or expired." },
  invalid_youtube_url: {
    status: 400,
    detail: "youtube_url is not a recognisable YouTube link.",
  },
  video_not_public: {
    status: 422,
    detail: "The video is private or unlisted.",
  },
  video_not_embeddable: {
    status: 422,
    detail: "The video owner disabled embedding.",
  },
  video_is_live: {
    status: 422,
    detail: "The video is a live stream in progress.",
  },
  video_too_long: {
    status: 422,
    detail: "This lecture is 52 minutes long; the limit is 45 minutes.",
  },
  daily_limit_reached: {
    status: 429,
    detail: "The daily submission limit has been reached.",
  },
  video_not_found: {
    status: 404,
    detail: "No video exists for this video_key.",
  },
  video_not_ready: {
    status: 409,
    detail: "The video has not finished processing.",
  },
  invalid_request: {
    status: 422,
    detail: "body.question: String should have at least 1 character",
  },
  request_too_large: {
    status: 413,
    detail: "The request body must be at most 16384 bytes.",
  },
  youtube_unavailable: {
    status: 502,
    detail: "YouTube did not respond in time.",
  },
};

function problemResponse(code: ErrorCode) {
  const fixture = ERROR_FIXTURES[code];
  return HttpResponse.json(
    {
      type: `https://ishaara.app/errors/${code}`,
      title: code,
      status: fixture.status,
      detail: fixture.detail,
      code,
    },
    { status: fixture.status },
  );
}

/** `video_key` path params of the form `error-<code>` trigger the matching problem+json fixture. */
function errorCodeFromVideoKey(videoKey: string): ErrorCode | null {
  const match = /^error-(.+)$/.exec(videoKey);
  const code = match?.[1];
  return code && code in ERROR_FIXTURES ? (code as ErrorCode) : null;
}

/** Sentinel 11-character video IDs a test can paste as `youtu.be/<id>` to trigger a submit error. */
const SUBMIT_ERROR_VIDEO_IDS: Partial<Record<ErrorCode, string>> = {
  video_not_public: "vNotPublic1",
  video_not_embeddable: "vNotEmbed01",
  video_is_live: "vIsLiveNow1",
  video_too_long: "vTooLong001",
  daily_limit_reached: "vDailyLimt1",
  invalid_token: "vInvalidTk1",
};

function submitErrorCodeForUrl(youtubeUrl: string): ErrorCode | null {
  const match = Object.entries(SUBMIT_ERROR_VIDEO_IDS).find(([, videoId]) =>
    youtubeUrl.includes(videoId),
  );
  return (match?.[0] as ErrorCode | undefined) ?? null;
}

export const handlers = [
  http.post(`${API_BASE_URL}/v1/videos`, async ({ request }) => {
    const body = (await request.json()) as {
      youtube_url: string;
      narration_language: string;
    };
    const errorCode = submitErrorCodeForUrl(body.youtube_url);
    if (errorCode) {
      return problemResponse(errorCode);
    }
    const videoKey = `dQw4w9WgXcQ_${body.narration_language}_v1`;
    return HttpResponse.json(buildStatusResponse(videoKey), { status: 202 });
  }),

  http.get(`${API_BASE_URL}/v1/videos/:videoKey`, ({ params }) => {
    const videoKey = String(params.videoKey);
    const errorCode = errorCodeFromVideoKey(videoKey);
    if (errorCode) {
      return problemResponse(errorCode);
    }
    return HttpResponse.json(buildStatusResponse(videoKey));
  }),

  http.get(`${API_BASE_URL}/v1/videos/:videoKey/cues`, ({ params }) => {
    const videoKey = String(params.videoKey);
    const errorCode = errorCodeFromVideoKey(videoKey);
    if (errorCode) {
      return problemResponse(errorCode);
    }
    return HttpResponse.json({
      cues: [
        {
          cue_id: "cue-0001",
          start_seconds: 42.5,
          spoken_phrase: "as shown here",
          referent_kind: "diagram",
          board_description:
            "A labelled diagram of a piston inside a sealed cylinder.",
          gap_summary: "A piston diagram is drawn inside a sealed cylinder.",
          narration_text:
            "On the board is a diagram of a piston inside a sealed cylinder.",
          audio_url: "https://storage.googleapis.com/ishaara/cue-0001.wav",
          audio_duration_seconds: 6.2,
          confidence: 0.94,
        },
      ],
    });
  }),

  http.get(`${API_BASE_URL}/v1/videos/:videoKey/cues.vtt`, () =>
    HttpResponse.text(
      "WEBVTT\nKind: descriptions\nLanguage: en\n\ncue-0001\n00:00:42.500 --> 00:00:48.700\nA labelled diagram of a piston.\n",
      { headers: { "Content-Type": "text/vtt; charset=utf-8" } },
    ),
  ),

  http.get(`${API_BASE_URL}/v1/videos/:videoKey/notes`, () =>
    HttpResponse.text("<h2>0:00</h2><p>Introduction to thermodynamics.</p>", {
      headers: { "Content-Type": "text/html" },
    }),
  ),

  http.post(`${API_BASE_URL}/v1/videos/:videoKey/questions`, () =>
    HttpResponse.json({
      answer_text: "The board showed the ideal gas law, P V equals n R T.",
      answer_audio_url: "https://storage.googleapis.com/ishaara/answer_001.wav",
      referenced_seconds: [128],
    }),
  ),

  http.get(`${API_BASE_URL}/v1/me/videos`, () =>
    // duration_seconds/status/error_message intentionally omitted — the real
    // backend doesn't send them yet (see docs/backend-requests.md).
    HttpResponse.json({
      videos: [
        {
          video_key: "dQw4w9WgXcQ_en_v1",
          title: "Introduction to Thermodynamics",
          submitted_at: "2026-10-10T09:15:00Z",
        },
      ],
    }),
  ),
];
