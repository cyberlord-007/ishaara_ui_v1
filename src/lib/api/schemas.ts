import { z } from "zod";
import { isParsableYouTubeUrl } from "@/lib/youtube-url";

export const VideoStatus = z.enum(["queued", "processing", "ready", "failed"]);
export type VideoStatus = z.infer<typeof VideoStatus>;

export const PipelineStage = z.enum([
  "resolving",
  "analyzing",
  "writing",
  "voicing",
  "saving",
]);
export type PipelineStage = z.infer<typeof PipelineStage>;

export const NarrationLanguage = z.enum(["en", "hi"]);
export type NarrationLanguage = z.infer<typeof NarrationLanguage>;

export const ReferentKind = z.enum([
  "equation",
  "diagram",
  "graph",
  "code",
  "table",
  "text",
  "physical_object",
]);
export type ReferentKind = z.infer<typeof ReferentKind>;

/** Branded so a raw string can never be passed where a video key is expected. */
export const VideoKey = z
  .string()
  .regex(/^[A-Za-z0-9_-]{11}_(en|hi)_v\d+$/)
  .brand<"VideoKey">();
export type VideoKey = z.infer<typeof VideoKey>;

export const NarrationCueSchema = z
  .object({
    cue_id: z.string(),
    start_seconds: z.number().nonnegative(),
    spoken_phrase: z.string(),
    referent_kind: ReferentKind,
    board_description: z.string(),
    narration_text: z.string(),
    audio_url: z.string().url().nullable(),
    audio_duration_seconds: z.number().positive().nullable(),
    confidence: z.number().min(0).max(1),
  })
  .transform((cue) => ({
    cueId: cue.cue_id,
    startSeconds: cue.start_seconds,
    spokenPhrase: cue.spoken_phrase,
    referentKind: cue.referent_kind,
    boardDescription: cue.board_description,
    narrationText: cue.narration_text,
    audioUrl: cue.audio_url,
    audioDurationSeconds: cue.audio_duration_seconds,
    confidence: cue.confidence,
  }));
export type NarrationCue = z.output<typeof NarrationCueSchema>;

// Inferred from VideoRecord; confirm against /openapi.json once the backend is reachable.
export const VideoStatusResponseSchema = z.object({
  video_key: VideoKey,
  youtube_video_id: z.string().length(11),
  narration_language: NarrationLanguage,
  title: z.string(),
  channel_title: z.string(),
  duration_seconds: z.number().int().nonnegative(),
  status: VideoStatus,
  stage: PipelineStage.nullable(),
  progress_percent: z.number().int().min(0).max(100),
  error_code: z.string().nullable(),
  error_message: z.string().nullable(),
});
export type VideoStatusResponse = z.infer<typeof VideoStatusResponseSchema>;

export const CuesResponseSchema = z.object({
  cues: z.array(NarrationCueSchema),
});
export type CuesResponse = z.infer<typeof CuesResponseSchema>;

export const QuestionAnswerSchema = z
  .object({
    answer_text: z.string(),
    answer_audio_url: z.string().url().nullable(),
    referenced_seconds: z.array(z.number().nonnegative()),
  })
  .transform((answer) => ({
    answerText: answer.answer_text,
    answerAudioUrl: answer.answer_audio_url,
    referencedSeconds: answer.referenced_seconds,
  }));
export type QuestionAnswer = z.output<typeof QuestionAnswerSchema>;

export const VideoSummarySchema = VideoStatusResponseSchema.pick({
  video_key: true,
  title: true,
  channel_title: true,
  duration_seconds: true,
  narration_language: true,
  status: true,
}).extend({ submitted_at: z.iso.datetime() });
export type VideoSummary = z.infer<typeof VideoSummarySchema>;

export const HistoryResponseSchema = z.object({
  videos: z.array(VideoSummarySchema),
});
export type HistoryResponse = z.infer<typeof HistoryResponseSchema>;

export const SubmitVideoRequest = z.object({
  youtube_url: z
    .string()
    .trim()
    .min(1)
    .refine(isParsableYouTubeUrl, "invalid_youtube_url"),
  narration_language: NarrationLanguage,
});
export type SubmitVideoRequest = z.infer<typeof SubmitVideoRequest>;

export const AskQuestionRequest = z.object({
  question: z.string().trim().min(3).max(500),
  at_seconds: z.number().nonnegative().nullable(),
});
export type AskQuestionRequest = z.infer<typeof AskQuestionRequest>;
