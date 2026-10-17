"use client";

import { useSelector } from "@xstate/react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";
import type { PlayerActorRef } from "@/features/player/components/PlayerShell";
import { formatClock } from "@/lib/time";

interface AnswerCardProps {
  actorRef: PlayerActorRef;
}

/**
 * The machine itself already shows/announces the answer and plays
 * `answerAudioUrl` (`setAnswer`/`playAnswerAudioIfAny`, from F4) — this just
 * renders what's in context, plus `referencedSeconds` as jump links.
 */
export function AnswerCard({ actorRef }: AnswerCardProps) {
  const t = useTranslations("ask");
  const answer = useSelector(actorRef, (snapshot) => snapshot.context.answer);

  if (!answer) {
    return null;
  }

  return (
    <div className="flex flex-col gap-3 rounded-panel bg-surface-raised p-5">
      <h3 className="m-0 text-section font-bold">{t("answerHeading")}</h3>
      <p className="m-0 text-lg">{answer.answerText}</p>
      {answer.referencedSeconds.length > 0 ? (
        <div className="flex flex-col gap-2">
          <p className="m-0 font-bold">{t("referencedMomentsHeading")}</p>
          <div className="flex flex-wrap gap-2">
            {answer.referencedSeconds.map((seconds) => (
              <Button
                key={seconds}
                variant="secondary"
                onPress={() => {
                  actorRef.send({ type: "ANSWER_DONE" });
                  actorRef.send({ type: "SEEK", seconds });
                }}
              >
                {t("jumpTo", { time: formatClock(seconds) })}
              </Button>
            ))}
          </div>
        </div>
      ) : null}
      <Button
        variant="quiet"
        className="self-start"
        onPress={() => actorRef.send({ type: "ANSWER_DONE" })}
      >
        {t("done")}
      </Button>
    </div>
  );
}
