"use client";

import type { Route } from "next";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useHistory } from "@/lib/api/hooks";
import type { VideoStatus } from "@/lib/api/schemas";
import { formatSpokenDuration } from "@/lib/time";
import { parseVideoKey } from "@/lib/videoKey";

const LANGUAGE_NAME_KEYS = {
  en: "languageNameEn",
  hi: "languageNameHi",
} as const;

function statusKey(
  status: VideoStatus,
): "statusReady" | "statusInProgress" | "statusFailed" {
  if (status === "ready") {
    return "statusReady";
  }
  if (status === "failed") {
    return "statusFailed";
  }
  return "statusInProgress";
}

/** Up to three most recent videos from the backend history, shown below the submit form. */
export function RecentVideos() {
  const t = useTranslations("home");
  const history = useHistory();
  const videos = history.data?.videos.slice(0, 3) ?? [];

  if (videos.length === 0) {
    return null;
  }

  return (
    <section
      aria-labelledby="recent-heading"
      className="flex min-w-0 max-w-md flex-1 flex-col gap-4 rounded-panel bg-surface-raised p-7"
    >
      <h2 id="recent-heading" className="m-0 text-section font-bold">
        {t("recentHeading")}
      </h2>
      <ul className="m-0 flex flex-col gap-1 p-0" style={{ listStyle: "none" }}>
        {videos.map((video) => {
          const destination = `/watch?v=${video.video_key}` as Route;
          // `/v1/me/videos` doesn't return status/duration yet (see
          // docs/backend-requests.md) — without it, don't assume the video is
          // ready to watch.
          const isReady = video.status === "ready";
          const language = parseVideoKey(video.video_key).narrationLanguage;
          const details = [
            t(LANGUAGE_NAME_KEYS[language]),
            video.duration_seconds != null
              ? formatSpokenDuration(video.duration_seconds)
              : null,
            video.status ? t(statusKey(video.status)) : null,
          ].filter((part): part is string => part !== null);
          return (
            <li
              key={video.video_key}
              className="flex flex-col border-b border-ink/20 py-3 last:border-b-0"
            >
              {isReady ? (
                <Link href={destination} className="text-lg font-bold text-pen">
                  {video.title}
                </Link>
              ) : (
                <span className="text-lg font-bold">{video.title}</span>
              )}
              <span className="text-base text-ink-muted">
                {details.join(", ")}
              </span>
            </li>
          );
        })}
      </ul>
      <Link href="/library" className="self-start text-base font-bold text-pen">
        {t("seeAllInLibrary")}
      </Link>
    </section>
  );
}
