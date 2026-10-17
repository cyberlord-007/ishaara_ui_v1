"use client";

import { useTranslations } from "next-intl";

export function AppFooter() {
  const t = useTranslations("app");
  return (
    <footer className="border-t border-ink/20 px-8 py-6 text-sm text-ink-muted">
      {t("name")}
    </footer>
  );
}
