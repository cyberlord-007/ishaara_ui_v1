"use client";

import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Suspense } from "react";
import { AuthGate } from "@/components/AuthGate";
import { useDocumentTitle } from "@/lib/a11y/useDocumentTitle";
import { useFocusOnMount } from "@/lib/a11y/useFocusOnMount";
import { useVideoStatus } from "@/lib/api/hooks";
import { VideoKey } from "@/lib/api/schemas";

/** The narrated player (F4/F5) lands later; this just confirms the video Processing handed off. */
function WatchContent() {
  const t = useTranslations("watch");
  const headingRef = useFocusOnMount<HTMLHeadingElement>();
  const searchParams = useSearchParams();
  const videoKeyResult = VideoKey.safeParse(searchParams.get("v"));
  const videoKey = videoKeyResult.success ? videoKeyResult.data : null;
  const videoStatus = useVideoStatus(videoKey ?? ("" as VideoKey));
  const title = videoStatus.data?.title ?? t("title");

  useDocumentTitle(title);

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-4 px-8 py-16">
      <h1
        ref={headingRef}
        tabIndex={-1}
        className="route-heading m-0 text-title font-bold"
      >
        {title}
      </h1>
      <p className="m-0 text-ink-muted">{t("comingSoon")}</p>
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
