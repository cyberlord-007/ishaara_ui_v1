"use client";

import type { Route } from "next";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/providers/AuthProvider";

const NAV_ITEMS = [
  { href: "/", key: "home" },
  { href: "/library", key: "library" },
  { href: "/settings", key: "settings" },
  { href: "/me", key: "profile" },
] as const;

/** Full nav (Home, Library, Settings, Me, Sign out) once signed in; logo only otherwise. */
export function Header() {
  const t = useTranslations("nav");
  const tApp = useTranslations("app");
  const pathname = usePathname();
  const { user, signOut } = useAuth();

  return (
    <header className="border-b border-ink/20">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-8 py-3">
        <Link
          href="/"
          className="inline-flex min-h-11 items-center gap-2.5 text-xl font-bold text-ink no-underline"
        >
          <IshaaraMark />
          {tApp("name")}
        </Link>
        {user ? (
          <nav aria-label="Main">
            <ul className="m-0 flex list-none flex-wrap items-center gap-1 p-0">
              {NAV_ITEMS.map((item) => {
                const isCurrent = pathname === item.href;
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href as Route}
                      aria-current={isCurrent ? "page" : undefined}
                      className={
                        isCurrent
                          ? "inline-flex min-h-11 items-center rounded-control px-3.5 font-bold text-ink underline decoration-highlighter decoration-4 underline-offset-8"
                          : "inline-flex min-h-11 items-center rounded-control px-3.5 text-ink no-underline"
                      }
                    >
                      {t(item.key)}
                    </Link>
                  </li>
                );
              })}
              <li>
                <Button variant="secondary" onPress={() => void signOut()}>
                  {t("signOut")}
                </Button>
              </li>
            </ul>
          </nav>
        ) : null}
      </div>
    </header>
  );
}

function IshaaraMark() {
  return (
    <svg aria-hidden="true" width="30" height="30" viewBox="0 0 30 30">
      <rect
        x="2"
        y="13"
        width="26"
        height="11"
        rx="3"
        fill="var(--color-highlighter)"
      />
      <path
        d="M9 4 L9 19 L12.5 16 L15 22 L17.4 21 L14.9 15.2 L19.5 15.2 Z"
        fill="var(--color-ink)"
      />
    </svg>
  );
}
