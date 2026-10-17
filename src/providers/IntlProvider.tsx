"use client";

import { NextIntlClientProvider } from "next-intl";
import type { ReactNode } from "react";
import en from "@/messages/en.json";
import hi from "@/messages/hi.json";
import { usePreferencesStore } from "@/stores/preferencesStore";

const MESSAGES = { en, hi };

/**
 * Picks `en`/`hi` messages from the preferences store's `interfaceLanguage`
 * (a client preference, not a URL segment — static export has no
 * per-request routing) and feeds them to `next-intl`.
 */
export function IntlProvider({ children }: { children: ReactNode }) {
  const interfaceLanguage = usePreferencesStore(
    (state) => state.interfaceLanguage,
  );

  return (
    <NextIntlClientProvider
      locale={interfaceLanguage}
      messages={MESSAGES[interfaceLanguage]}
      timeZone="Asia/Kolkata"
    >
      {children}
    </NextIntlClientProvider>
  );
}
