"use client";

import { useTranslations } from "next-intl";
import { AuthGate } from "@/components/AuthGate";
import { LinkForm } from "@/features/submit/LinkForm";
import { RecentVideos } from "@/features/submit/RecentVideos";
import { useDocumentTitle } from "@/lib/a11y/useDocumentTitle";
import { useFocusOnMount } from "@/lib/a11y/useFocusOnMount";
import { getFirstName } from "@/lib/name";
import { getGreetingPeriod } from "@/lib/time";
import { useAuth } from "@/providers/AuthProvider";

const GREETING_KEYS = {
  morning: "greetingMorning",
  afternoon: "greetingAfternoon",
  evening: "greetingEvening",
  default: "greetingDefault",
} as const;

function HomeContent() {
  const t = useTranslations("home");
  useDocumentTitle(t("title"));
  const headingRef = useFocusOnMount<HTMLHeadingElement>();
  const { user } = useAuth();
  const firstName = getFirstName(user?.displayName);
  const greeting = t(GREETING_KEYS[getGreetingPeriod(new Date().getHours())]);

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-1 flex-wrap items-start gap-16 px-8 py-16">
      <div className="flex min-w-0 max-w-2xl flex-1 flex-col gap-8">
        <h1
          ref={headingRef}
          tabIndex={-1}
          className="route-heading m-0 text-lecture font-bold"
        >
          {firstName ? (
            <>
              {greeting}
              {", "}
              <mark
                className="rounded bg-highlighter px-2.5"
                style={{ color: "#0f1c3f" }}
              >
                {firstName}
              </mark>
            </>
          ) : (
            greeting
          )}
        </h1>
        <LinkForm />
      </div>
      <RecentVideos />
    </div>
  );
}

export default function Home() {
  return (
    <AuthGate>
      <HomeContent />
    </AuthGate>
  );
}
