"use client";

import type { Route } from "next";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Suspense, useEffect } from "react";
import { AuthGate } from "@/components/AuthGate";
import { PlayerShell } from "@/features/player/components/PlayerShell";
import { useDocumentTitle } from "@/lib/a11y/useDocumentTitle";
import { useFocusOnMount } from "@/lib/a11y/useFocusOnMount";
import { ApiError, toUserMessage } from "@/lib/api/errors";
import { useVideoStatus } from "@/lib/api/hooks";
import { VideoKey } from "@/lib/api/schemas";

function ErrorNotice({
  message,
  nextStep,
}: {
  message: string;
  nextStep: string;
}) {
  const t = useTranslations("watch");
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

/** A non-ready video is handed off to Processing, which already owns that UI. */
function WatchContent() {
  const t = useTranslations("watch");
  const headingRef = useFocusOnMount<HTMLHeadingElement>();
  const router = useRouter();
  const searchParams = useSearchParams();

  const videoKeyResult = VideoKey.safeParse(searchParams.get("v"));
  const videoKey = videoKeyResult.success ? videoKeyResult.data : null;
  const secondsParam = searchParams.get("t");
  const initialSeekSeconds =
    secondsParam !== null && !Number.isNaN(Number(secondsParam))
      ? Number(secondsParam)
      : null;

  const videoStatus = useVideoStatus(videoKey ?? ("" as VideoKey));
  const data = videoStatus.data;

  useEffect(() => {
    if (videoKey && data && data.status !== "ready") {
      router.replace(`/processing?v=${videoKey}` as Route);
    }
  }, [data, videoKey, router]);

  useDocumentTitle(data?.title ?? t("title"));

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

  if (!data || data.status !== "ready") {
    return (
      <output className="block px-8 py-16 text-center text-ink-muted">
        {t("checkingStatus")}
      </output>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-6 px-8 py-16">
      <h1
        ref={headingRef}
        tabIndex={-1}
        className="route-heading m-0 text-title font-bold"
      >
        {data.title}
      </h1>
      <PlayerShell
        videoKey={videoKey}
        title={data.title}
        initialSeekSeconds={initialSeekSeconds}
      />
    </div>
  );
}

export default function WatchPage() {
  return (
    <AuthGate>
      <Suspense>
        <WatchContent />
      </Suspense>
    </AuthGate>
  );
}
