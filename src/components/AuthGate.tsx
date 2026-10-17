"use client";

import type { Route } from "next";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { type ReactNode, Suspense, useEffect } from "react";
import { useAuth } from "@/providers/AuthProvider";

function CheckingStatus() {
  const t = useTranslations("authGate");
  return (
    <output className="block px-8 py-16 text-center text-ink-muted">
      {t("checking")}
    </output>
  );
}

function AuthGateInner({ children }: { children: ReactNode }) {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (isLoading || user) {
      return;
    }
    const search = searchParams.toString();
    const next = search ? `${pathname}?${search}` : pathname;
    router.replace(`/sign-in?next=${encodeURIComponent(next)}` as Route);
  }, [isLoading, user, pathname, searchParams, router]);

  if (isLoading || !user) {
    return <CheckingStatus />;
  }

  return <>{children}</>;
}

/**
 * Renders `children` once a Firebase user is signed in; otherwise redirects
 * to `/sign-in?next=<current path>` so sign-in can return the user here.
 * Static export has no server-side auth guard, so this always renders a
 * labelled loading state first rather than a blank page. `useSearchParams`
 * needs a Suspense boundary to prerender under static export.
 */
export function AuthGate({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={<CheckingStatus />}>
      <AuthGateInner>{children}</AuthGateInner>
    </Suspense>
  );
}
