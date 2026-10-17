import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as endpoints from "@/lib/api/endpoints";
import type {
  AskQuestionRequest,
  SubmitVideoRequest,
  VideoKey,
  VideoStatus,
} from "@/lib/api/schemas";

const CUES_AND_NOTES_GC_TIME_MS = 30 * 60 * 1000;

function isTerminalStatus(status: VideoStatus | undefined): boolean {
  return status === "ready" || status === "failed";
}

/** `POST /v1/videos`. Invalidates the history list on success. */
export function useSubmitVideo() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (request: SubmitVideoRequest) => endpoints.submitVideo(request),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["me", "videos"] });
    },
  });
}

/**
 * `GET /v1/videos/{video_key}`. Polls every 3 seconds until `status` is
 * `ready` or `failed` — also stops on a persistent fetch/parse error, so a
 * broken response doesn't retry forever every 3 seconds (`query.state.data`
 * stays `undefined` on an error, which `isTerminalStatus` alone can't see).
 */
export function useVideoStatus(videoKey: VideoKey) {
  return useQuery({
    queryKey: ["video", videoKey],
    queryFn: () => endpoints.getVideoStatus(videoKey),
    refetchInterval: (query) =>
      isTerminalStatus(query.state.data?.status) ||
      query.state.fetchFailureCount > 0
        ? false
        : 3000,
    refetchIntervalInBackground: true,
  });
}

/** `GET /v1/videos/{video_key}/cues`. Enable only once `status` is `ready`; results are immutable. */
export function useCues(videoKey: VideoKey, enabled: boolean) {
  return useQuery({
    queryKey: ["video", videoKey, "cues"],
    queryFn: () => endpoints.getCues(videoKey),
    enabled,
    staleTime: Number.POSITIVE_INFINITY,
    gcTime: CUES_AND_NOTES_GC_TIME_MS,
  });
}

/**
 * `GET /v1/videos/{video_key}/cues.vtt`, as a blob URL a `<track src>` can use.
 * The blob URL lives for this query's `gcTime` — TanStack Query, not the caller,
 * owns when it's no longer needed; nothing revokes it mid-cache-life.
 */
export function useCuesVtt(videoKey: VideoKey, enabled: boolean) {
  return useQuery({
    queryKey: ["video", videoKey, "cuesVtt"],
    queryFn: async () =>
      URL.createObjectURL(await endpoints.getCuesVtt(videoKey)),
    enabled,
    staleTime: Number.POSITIVE_INFINITY,
    gcTime: CUES_AND_NOTES_GC_TIME_MS,
  });
}

/** `GET /v1/videos/{video_key}/notes?format=html`. Results are immutable per `video_key`. */
export function useNotes(videoKey: VideoKey, enabled: boolean) {
  return useQuery({
    queryKey: ["video", videoKey, "notes"],
    queryFn: () => endpoints.getNotesHtml(videoKey),
    enabled,
    staleTime: Number.POSITIVE_INFINITY,
    gcTime: CUES_AND_NOTES_GC_TIME_MS,
  });
}

/**
 * `GET /v1/videos/{video_key}/notes?format=markdown`, fetched on demand (the
 * Download button calls `refetch()`) rather than alongside the HTML notes —
 * nothing else on the Notes page needs the Markdown form.
 */
export function useNotesMarkdown(videoKey: VideoKey) {
  return useQuery({
    queryKey: ["video", videoKey, "notesMarkdown"],
    queryFn: () => endpoints.getNotesMarkdown(videoKey),
    enabled: false,
    staleTime: Number.POSITIVE_INFINITY,
    gcTime: CUES_AND_NOTES_GC_TIME_MS,
  });
}

/** `POST /v1/videos/{video_key}/questions`. */
export function useAskQuestion(videoKey: VideoKey) {
  return useMutation({
    mutationFn: (request: AskQuestionRequest) =>
      endpoints.askQuestion(videoKey, request),
  });
}

/** `GET /v1/me/videos`. */
export function useHistory() {
  return useQuery({
    queryKey: ["me", "videos"],
    queryFn: () => endpoints.getHistory(),
  });
}
