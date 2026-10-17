"use client";

import { useTranslations } from "next-intl";
import { AuthGate } from "@/components/AuthGate";
import { useDocumentTitle } from "@/lib/a11y/useDocumentTitle";
import { useFocusOnMount } from "@/lib/a11y/useFocusOnMount";

/** Full history list lands in F7; this is the shell the nav links to until then. */
function LibraryContent() {
  const t = useTranslations("library");
  useDocumentTitle(t("title"));
  const headingRef = useFocusOnMount<HTMLHeadingElement>();

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-4 px-8 py-16">
      <h1
        ref={headingRef}
        tabIndex={-1}
        className="route-heading m-0 text-title font-bold"
      >
        {t("title")}
      </h1>
      <p className="m-0 text-ink-muted">{t("comingSoon")}</p>
    </div>
  );
}

export default function LibraryPage() {
  return (
    <AuthGate>
      <LibraryContent />
    </AuthGate>
  );
}
