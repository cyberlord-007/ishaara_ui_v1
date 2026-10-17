"use client";

import { useSelector } from "@xstate/react";
import { useTranslations } from "next-intl";
import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/Button";
import { useAnnounce } from "@/lib/a11y/useAnnounce";
import { formatClock } from "@/lib/time";
import type { PlayerActorRef } from "./PlayerShell";

const KIND_LABEL_KEYS = {
  equation: "kindEquation",
  diagram: "kindDiagram",
  graph: "kindGraph",
  code: "kindCode",
  table: "kindTable",
  text: "kindText",
  physical_object: "kindPhysicalObject",
} as const;

interface NowDescribingProps {
  actorRef: PlayerActorRef;
}

/**
 * The current cue's text, kind and time are always visible here (for
 * low-vision and deaf-blind/braille users). `narrating.speaking` relies on
 * the audio itself, so nothing is announced; `narrating.awaitingResume`
 * sends the narration text to the assertive live region once per cue.
 */
export function NowDescribing({ actorRef }: NowDescribingProps) {
  const t = useTranslations("watch.nowDescribing");
  const announce = useAnnounce();
  const activeCue = useSelector(
    actorRef,
    (snapshot) => snapshot.context.activeCue,
  );
  const isAwaitingResume = useSelector(actorRef, (snapshot) =>
    snapshot.matches({ narrating: "awaitingResume" }),
  );
  const announcedCueIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!isAwaitingResume) {
      announcedCueIdRef.current = null;
      return;
    }
    if (activeCue && announcedCueIdRef.current !== activeCue.cueId) {
      announce(activeCue.narrationText, "assertive");
      announcedCueIdRef.current = activeCue.cueId;
    }
  }, [isAwaitingResume, activeCue, announce]);

  return (
    <section
      aria-labelledby="now-describing-heading"
      className="flex flex-col gap-3 rounded-panel bg-surface-raised p-5"
    >
      <h2 id="now-describing-heading" className="m-0 text-section font-bold">
        {t("heading")}
      </h2>
      {activeCue ? (
        <>
          <p className="m-0 text-lg">{activeCue.narrationText}</p>
          <p className="m-0 text-ink-muted">
            {t(KIND_LABEL_KEYS[activeCue.referentKind])},{" "}
            {formatClock(activeCue.startSeconds)}
          </p>
          {isAwaitingResume ? (
            <p className="m-0 text-ink-muted">{t("waitingForResume")}</p>
          ) : null}
          <div className="flex flex-wrap gap-2">
            <Button
              variant="secondary"
              onPress={() => actorRef.send({ type: "REPEAT" })}
            >
              {t("repeat")}
            </Button>
            <Button
              variant="secondary"
              onPress={() => actorRef.send({ type: "SKIP" })}
            >
              {t("skip")}
            </Button>
            {isAwaitingResume ? (
              <Button onPress={() => actorRef.send({ type: "RESUME" })}>
                {t("resume")}
              </Button>
            ) : null}
          </div>
        </>
      ) : (
        <p className="m-0 text-ink-muted">{t("nothingActive")}</p>
      )}
    </section>
  );
}
