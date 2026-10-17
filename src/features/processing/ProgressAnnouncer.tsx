"use client";

import { useTranslations } from "next-intl";
import { useEffect, useRef } from "react";
import { STAGE_LABEL_KEYS } from "@/features/processing/StageList";
import { useAnnounce } from "@/lib/a11y/useAnnounce";
import type { PipelineStage, VideoStatus } from "@/lib/api/schemas";

interface ProgressAnnouncerProps {
  status: VideoStatus;
  stage: PipelineStage | null;
  progressPercent: number;
}

/**
 * Announces a stage change or a new 20%-progress milestone, never every poll
 * (polling happens every 3s). Renders nothing.
 */
export function ProgressAnnouncer({
  status,
  stage,
  progressPercent,
}: ProgressAnnouncerProps) {
  const t = useTranslations("processing");
  const announce = useAnnounce();
  const lastAnnounced = useRef<{ stage: PipelineStage | null; bucket: number }>(
    {
      stage: null,
      bucket: -1,
    },
  );

  useEffect(() => {
    if (status === "ready") {
      announce(t("readyAnnouncement"), "polite");
      return;
    }
    if (!stage) {
      return;
    }
    const bucket = Math.floor(progressPercent / 20);
    if (
      stage === lastAnnounced.current.stage &&
      bucket === lastAnnounced.current.bucket
    ) {
      return;
    }
    lastAnnounced.current = { stage, bucket };
    announce(
      t("progressAnnouncement", {
        stage: t(STAGE_LABEL_KEYS[stage]),
        percent: progressPercent,
      }),
      "polite",
    );
  }, [status, stage, progressPercent, announce, t]);

  return null;
}
