"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { useDocumentTitle } from "@/lib/a11y/useDocumentTitle";
import { useFocusOnMount } from "@/lib/a11y/useFocusOnMount";

export default function NotFound() {
  const t = useTranslations("notFound");
  useDocumentTitle(t("title"));
  const headingRef = useFocusOnMount<HTMLHeadingElement>();

  return (
    <div className="mx-auto flex w-full max-w-md flex-1 flex-col gap-4 px-8 py-16">
      <h1
        ref={headingRef}
        tabIndex={-1}
        className="route-heading m-0 text-title font-bold"
      >
        {t("title")}
      </h1>
      <p className="m-0 text-ink-muted">{t("body")}</p>
      <Link href="/" className="font-bold text-pen">
        {t("backHome")}
      </Link>
    </div>
  );
}
