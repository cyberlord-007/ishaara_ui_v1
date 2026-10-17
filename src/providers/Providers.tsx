"use client";

import type { ReactNode } from "react";
import { ToastRegionRoot } from "@/components/ui/Toast";
import { AnnouncerProvider } from "@/providers/AnnouncerProvider";
import { AuthProvider } from "@/providers/AuthProvider";
import { IntlProvider } from "@/providers/IntlProvider";
import { PreferencesEffects } from "@/providers/PreferencesEffects";
import { QueryProvider } from "@/providers/QueryProvider";

/** Every client provider the app needs, composed in one place so `app/layout.tsx` stays a Server Component. */
export function Providers({ children }: { children: ReactNode }) {
  return (
    <QueryProvider>
      <AuthProvider>
        <IntlProvider>
          <AnnouncerProvider>
            <PreferencesEffects />
            {children}
            <ToastRegionRoot />
          </AnnouncerProvider>
        </IntlProvider>
      </AuthProvider>
    </QueryProvider>
  );
}
