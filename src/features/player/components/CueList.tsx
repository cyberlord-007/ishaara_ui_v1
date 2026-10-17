"use client";

import { useSelector } from "@xstate/react";
import { useTranslations } from "next-intl";
import { useEffect, useRef } from "react";
import type { NarrationCue } from "@/lib/api/schemas";
import { formatClock } from "@/lib/time";
import type { PlayerActorRef } from "./PlayerShell";

interface CueListProps {
  actorRef: PlayerActorRef;
  cues: readonly NarrationCue[];
}

/**
 * "Described moments": each item jumps there via `JUMP_TO_CUE` (never raw
 * `SEEK` — see docs/DECISIONS.md's F4 note on why). The active item gets
 * `aria-current`, never focus; it only scrolls into view when focus is
 * already inside this list, so narration elsewhere on the page never yanks
 * the viewport around.
 */
export function CueList({ actorRef, cues }: CueListProps) {
  const t = useTranslations("watch.cueList");
  const activeCueId = useSelector(
    actorRef,
    (snapshot) =>
      snapshot.context.activeCue?.cueId ??
      snapshot.context.lastNarratedCue?.cueId ??
      null,
  );
  const listRef = useRef<HTMLOListElement>(null);

  useEffect(() => {
    const list = listRef.current;
    if (!list || !activeCueId || !list.contains(document.activeElement)) {
      return;
    }
    list
      .querySelector(`[data-cue-id="${activeCueId}"]`)
      ?.scrollIntoView({ block: "nearest" });
  }, [activeCueId]);

  return (
    <section
      aria-labelledby="cue-list-heading"
      className="rounded-panel bg-surface-raised p-5"
    >
      <h2 id="cue-list-heading" className="m-0 text-section font-bold">
        {t("heading")}
      </h2>
      {cues.length === 0 ? (
        <p className="m-0 text-ink-muted">{t("emptyState")}</p>
      ) : (
        <ol
          ref={listRef}
          className="m-0 mt-3 flex flex-col gap-1 p-0"
          style={{ listStyle: "none" }}
        >
          {cues.map((cue) => {
            const isActive = cue.cueId === activeCueId;
            return (
              <li key={cue.cueId}>
                <button
                  type="button"
                  data-cue-id={cue.cueId}
                  aria-current={isActive ? "true" : undefined}
                  onClick={() =>
                    actorRef.send({ type: "JUMP_TO_CUE", cueId: cue.cueId })
                  }
                  className={`flex w-full items-baseline gap-3 rounded-control px-3 py-2 text-left ${
                    isActive
                      ? "border-2 border-pen bg-surface"
                      : "border border-transparent"
                  }`}
                >
                  <span
                    aria-hidden="true"
                    className="tabular-nums text-ink-muted"
                  >
                    {formatClock(cue.startSeconds)}
                  </span>
                  <span>{cue.spokenPhrase || cue.narrationText}</span>
                </button>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}
