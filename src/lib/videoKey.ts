import type { NarrationLanguage, VideoKey } from "@/lib/api/schemas";

export interface ParsedVideoKey {
  youtubeVideoId: string;
  narrationLanguage: NarrationLanguage;
  pipelineVersion: number;
}

const VIDEO_KEY_PATTERN = /^([A-Za-z0-9_-]{11})_(en|hi)_v(\d+)$/;

/**
 * Recovers the YouTube video id, narration language and pipeline version that
 * `video_key` encodes (`{youtube_id}_{language}_v{pipeline_version}`) — the backend
 * doesn't return these as separate fields on any response.
 * @throws {Error} if `videoKey` doesn't match the pattern `VideoKey`'s own schema
 * already validates, which should never happen for a value typed as `VideoKey`
 */
export function parseVideoKey(videoKey: VideoKey): ParsedVideoKey {
  const match = VIDEO_KEY_PATTERN.exec(videoKey);
  if (!match || !match[1] || !match[2] || !match[3]) {
    throw new Error(`Malformed video key: ${videoKey}`);
  }
  return {
    youtubeVideoId: match[1],
    narrationLanguage: match[2] as NarrationLanguage,
    pipelineVersion: Number.parseInt(match[3], 10),
  };
}
