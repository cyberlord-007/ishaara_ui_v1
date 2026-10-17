"use client";

import { useSelector } from "@xstate/react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";
import { Slider } from "@/components/ui/Slider";
import { formatClock } from "@/lib/time";
import { usePreferencesStore } from "@/stores/preferencesStore";
import type { PlayerActorRef } from "./PlayerShell";

interface ControlBarProps {
  actorRef: PlayerActorRef;
}

/** Play/Pause, seek by 10s, jump between described moments, narration speed. */
export function ControlBar({ actorRef }: ControlBarProps) {
  const t = useTranslations("watch.controlBar");
  const isPlaying = useSelector(actorRef, (snapshot) =>
    snapshot.matches("playing"),
  );
  const currentSeconds = useSelector(
    actorRef,
    (snapshot) => snapshot.context.currentSeconds,
  );
  const narrationRate = usePreferencesStore((state) => state.narrationRate);
  const setPreference = usePreferencesStore((state) => state.setPreference);

  function seekBy(deltaSeconds: number): void {
    actorRef.send({
      type: "SEEK",
      seconds: Math.max(0, currentSeconds + deltaSeconds),
    });
  }

  return (
    <div className="flex flex-col gap-4 rounded-panel bg-surface-raised p-5">
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="secondary" onPress={() => seekBy(-10)}>
          {t("back10")}
        </Button>
        <Button onPress={() => actorRef.send({ type: "TOGGLE" })}>
          {isPlaying ? t("pause") : t("play")}
        </Button>
        <Button variant="secondary" onPress={() => seekBy(10)}>
          {t("forward10")}
        </Button>
        <Button
          variant="secondary"
          onPress={() => actorRef.send({ type: "PREVIOUS_CUE" })}
        >
          {t("previousDescription")}
        </Button>
        <Button
          variant="secondary"
          onPress={() => actorRef.send({ type: "NEXT_CUE" })}
        >
          {t("nextDescription")}
        </Button>
        <span aria-hidden="true" className="ml-auto tabular-nums">
          {formatClock(currentSeconds)}
        </span>
      </div>
      <Slider
        label={t("narrationSpeedLabel")}
        minValue={0.75}
        maxValue={1.5}
        step={0.25}
        value={narrationRate}
        onChange={(value) =>
          setPreference("narrationRate", value as 0.75 | 1 | 1.25 | 1.5)
        }
        formatValue={(value) => t("narrationSpeedValue", { rate: value })}
      />
    </div>
  );
}
