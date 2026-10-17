"use client";

import { useTranslations } from "next-intl";

/** The first focusable element on every page; visible only once focused. */
export function SkipLink() {
  const t = useTranslations("nav");
  return (
    <a href="#main" className="skip-link">
      {t("skipToContent")}
    </a>
  );
}
