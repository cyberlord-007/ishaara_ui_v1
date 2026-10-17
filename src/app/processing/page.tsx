"use client";

import type { Route } from "next";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Suspense, useEffect } from "react";
import { AuthGate } from "@/components/AuthGate";
import { ProgressAnnouncer } from "@/features/processing/ProgressAnnouncer";
import { STAGE_LABEL_KEYS, StageList } from "@/features/processing/StageList";
import { useDocumentTitle } from "@/lib/a11y/useDocumentTitle";
import { useFocusOnMount } from "@/lib/a11y/useFocusOnMount";
import { ApiError, toKnownErrorCode, toUserMessage } from "@/lib/api/errors";
import { useVideoStatus } from "@/lib/api/hooks";
import type { PipelineStage } from "@/lib/api/schemas";
import { VideoKey } from "@/lib/api/schemas";
import { formatSpokenDuration } from "@/lib/time";

const LANGUAGE_NAME_KEYS = {
  en: "languageNameEn",
  hi: "languageNameHi",
} as const;

function ErrorNotice({
  message,
  nextStep,
}: {
  message: string;
  nextStep: string;
}) {
  const t = useTranslations("processing");
  const headingRef = useFocusOnMount<HTMLHeadingElement>();
  useDocumentTitle(message);

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-4 px-8 py-16">
      <h1
        ref={headingRef}
        tabIndex={-1}
        className="route-heading m-0 text-title font-bold"
      >
        {message}
      </h1>
      <p role="alert" className="m-0 text-ink-muted">
        {nextStep}
      </p>
      <Link href="/library" className="self-start font-bold text-pen">
        {t("goToLibrary")}
      </Link>
    </div>
  );
}

function ProgressBar({
  stage,
  percent,
}: {
  stage: PipelineStage;
  percent: number;
}) {
  const t = useTranslations("processing");
  const stageLabel = t(STAGE_LABEL_KEYS[stage]);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-baseline justify-between gap-4">
        <span className="text-section font-bold">{stageLabel}</span>
        <span
          aria-hidden="true"
          className="text-section font-bold tabular-nums"
        >
          {percent}%
        </span>
      </div>
      <div
        aria-hidden="true"
        className="h-4 overflow-hidden rounded-full border border-ink/35 bg-surface-raised"
      >
        <div
          className="h-full rounded-full bg-pen"
          style={{ width: `${percent}%` }}
        />
      </div>
      <progress
        value={percent}
        max={100}
        aria-valuetext={`${stageLabel}, ${percent} percent`}
        className="visually-hidden"
      >
        {percent}%
      </progress>
      <p className="m-0 text-ink-muted">{t("usuallyTakes")}</p>
    </div>
  );
}

function ProcessingContent() {
  const t = useTranslations("processing");
  const home = useTranslations("home");
  const router = useRouter();
  const searchParams = useSearchParams();
  const headingRef = useFocusOnMount<HTMLHeadingElement>();

  const videoKeyResult = VideoKey.safeParse(searchParams.get("v"));
  const videoKey = videoKeyResult.success ? videoKeyResult.data : null;

  const videoStatus = useVideoStatus(videoKey ?? ("" as VideoKey));
  const data = videoStatus.data;

  useDocumentTitle(data?.title ?? t("preparingFor"));

  useEffect(() => {
    if (data?.status === "ready" && videoKey) {
      router.replace(`/watch?v=${videoKey}` as Route);
    }
  }, [data?.status, videoKey, router]);

  if (!videoKey) {
    const { message, nextStep } = toUserMessage("video_not_found");
    return <ErrorNotice message={message} nextStep={nextStep} />;
  }

  if (videoStatus.isError) {
    const { message, nextStep } =
      videoStatus.error instanceof ApiError
        ? toUserMessage(videoStatus.error.code, videoStatus.error.detail)
        : toUserMessage("network_error");
    return <ErrorNotice message={message} nextStep={nextStep} />;
  }

  if (!data) {
    return (
      <output className="block px-8 py-16 text-center text-ink-muted">
        {t("preparingFor")}…
      </output>
    );
  }

  if (data.status === "failed") {
    const { message, nextStep } = toUserMessage(
      toKnownErrorCode(data.error_code),
      data.error_message ?? undefined,
    );
    return <ErrorNotice message={message} nextStep={nextStep} />;
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-9 px-8 py-16">
      <ProgressAnnouncer
        status={data.status}
        stage={data.stage}
        progressPercent={data.progress_percent}
      />

      <div className="flex flex-col gap-2">
        <p className="m-0 text-ink-muted">{t("preparingFor")}</p>
        <h1
          ref={headingRef}
          tabIndex={-1}
          className="route-heading m-0 text-lecture font-bold"
        >
          {data.title}
        </h1>
        <p className="m-0 text-ink-muted">
          {data.channel_title}, {formatSpokenDuration(data.duration_seconds)},{" "}
          {t("narrationIn", {
            language: home(LANGUAGE_NAME_KEYS[data.narration_language]),
          })}
        </p>
      </div>

      {data.stage ? (
        <ProgressBar stage={data.stage} percent={data.progress_percent} />
      ) : null}

      <StageList status={data.status} currentStage={data.stage} />

      <div className="flex flex-wrap gap-3">
        <Link
          href={`/watch?v=${videoKey}` as Route}
          className="inline-flex min-h-14 items-center justify-center rounded-control border-2 border-pen px-6 font-bold text-pen no-underline"
        >
          {t("openWhenReady")}
        </Link>
        <Link
          href="/library"
          className="inline-flex min-h-14 items-center justify-center rounded-control px-6 font-bold text-ink no-underline"
        >
          {t("goToLibrary")}
        </Link>
      </div>
    </div>
  );
}

export default function ProcessingPage() {
  return (
    <AuthGate>
      <Suspense>
        <ProcessingContent />
      </Suspense>
    </AuthGate>
  );
}
