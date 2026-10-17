"use client";

import { useActorRef, useSelector } from "@xstate/react";
import { useTranslations } from "next-intl";
import { useEffect, useMemo, useRef, useState } from "react";
import type { ActorRefFrom } from "xstate";
import { useAnnounce } from "@/lib/a11y/useAnnounce";
import { useHotkeys } from "@/lib/a11y/useHotkeys";
import { ApiError, toKnownErrorCode, toUserMessage } from "@/lib/api/errors";
import { useCues } from "@/lib/api/hooks";
import type { NarrationCue, VideoKey } from "@/lib/api/schemas";
import { formatClock } from "@/lib/time";
import { parseVideoKey } from "@/lib/videoKey";
import { usePreferencesStore } from "@/stores/preferencesStore";
import { createNarrationAudioPort } from "../audio/narrationAudio";
import {
  createNarratedPlayerMachine,
  type NarratedPlayerSettings,
  type NarrationAudioPort,
  type VideoPlayerPort,
} from "../machine/narratedPlayerMachine";
import { createYouTubePlayerPort } from "../youtube/youtubePlayerPort";
import { ControlBar } from "./ControlBar";
import { CueList } from "./CueList";
import { NowDescribing } from "./NowDescribing";
import { ShortcutsDialog } from "./ShortcutsDialog";

export type PlayerActorRef = ActorRefFrom<
  ReturnType<typeof createNarratedPlayerMachine>
>;

interface PlayerShellProps {
  videoKey: VideoKey;
  title: string;
  initialSeekSeconds: number | null;
}

interface ReadyPorts {
  video: VideoPlayerPort;
  audio: NarrationAudioPort;
}

/**
 * Fetches cues and builds the real ports once the video container mounts.
 * `cues.vtt` (`useCuesVtt`) is intentionally not consumed here — a `<track>`
 * only attaches to a native `<video>`/`<audio>` element, and this player is
 * the YouTube IFrame API (a cross-origin iframe), which has no way to accept
 * an externally supplied text track. See `docs/DECISIONS.md`.
 */
export function PlayerShell({
  videoKey,
  title,
  initialSeekSeconds,
}: PlayerShellProps) {
  const t = useTranslations("watch");
  const { youtubeVideoId } = parseVideoKey(videoKey);
  const containerRef = useRef<HTMLDivElement>(null);
  const [ports, setPorts] = useState<ReadyPorts | null>(null);

  const cuesQuery = useCues(videoKey, true);

  useEffect(() => {
    if (!containerRef.current) {
      return;
    }
    const {
      port: video,
      ready,
      destroy,
    } = createYouTubePlayerPort(containerRef.current, youtubeVideoId, {
      title: `Lecture video: ${title}`,
    });
    const audio = createNarrationAudioPort();
    let cancelled = false;
    ready.then(() => {
      if (!cancelled) {
        setPorts({ video, audio });
      }
    });
    return () => {
      cancelled = true;
      destroy();
    };
  }, [youtubeVideoId, title]);

  const openOnYouTubeHref = `https://youtu.be/${youtubeVideoId}?t=${Math.round(
    initialSeekSeconds ?? 0,
  )}`;

  return (
    <div className="flex flex-col gap-6">
      <section
        aria-labelledby="video-section-heading"
        className="flex flex-col gap-3"
      >
        <h2 id="video-section-heading" className="visually-hidden">
          {t("videoSectionHeading")}
        </h2>
        <div
          ref={containerRef}
          className="aspect-video w-full overflow-hidden rounded-panel bg-ink"
          tabIndex={-1}
        />
        <a
          href={openOnYouTubeHref}
          target="_blank"
          rel="noreferrer"
          className="self-start text-base font-bold text-pen"
        >
          {t("openOnYouTube")}
        </a>
      </section>

      {cuesQuery.isError ? (
        <p role="alert" className="m-0 text-danger">
          {
            toUserMessage(
              cuesQuery.error instanceof ApiError
                ? cuesQuery.error.code
                : "network_error",
              cuesQuery.error instanceof ApiError
                ? cuesQuery.error.detail
                : undefined,
            ).message
          }
        </p>
      ) : null}

      {ports && cuesQuery.data ? (
        <NarratedPlayerInner
          ports={ports}
          cues={cuesQuery.data.cues}
          title={title}
          initialSeekSeconds={initialSeekSeconds}
        />
      ) : (
        <p className="m-0 text-ink-muted">{t("loadingDescriptions")}</p>
      )}
    </div>
  );
}

interface NarratedPlayerInnerProps {
  ports: ReadyPorts;
  cues: readonly NarrationCue[];
  title: string;
  initialSeekSeconds: number | null;
}

function NarratedPlayerInner({
  ports,
  cues,
  title,
  initialSeekSeconds,
}: NarratedPlayerInnerProps) {
  const t = useTranslations("watch");
  const announce = useAnnounce();
  const [shortcutsOpen, setShortcutsOpen] = useState(false);

  const narrationOutput = usePreferencesStore((state) => state.narrationOutput);
  const narrationRate = usePreferencesStore((state) => state.narrationRate);
  const autoPauseForCues = usePreferencesStore(
    (state) => state.autoPauseForCues,
  );
  const playEarcons = usePreferencesStore((state) => state.playEarcons);

  const settings = useMemo<NarratedPlayerSettings>(
    () => ({ narrationOutput, narrationRate, autoPauseForCues, playEarcons }),
    [narrationOutput, narrationRate, autoPauseForCues, playEarcons],
  );

  const machine = useMemo(() => createNarratedPlayerMachine(ports), [ports]);
  const actorRef = useActorRef(machine, {
    input: { cues, settings, initialSeekSeconds },
  }) as PlayerActorRef;

  // biome-ignore lint/correctness/useExhaustiveDependencies: sent once on mount only — ports are already confirmed ready by the parent.
  useEffect(() => {
    actorRef.send({ type: "PLAYER_READY" });
  }, []);

  useEffect(() => {
    actorRef.send({ type: "SETTINGS_CHANGED", settings });
  }, [actorRef, settings]);

  const topState = useSelector(actorRef, (snapshot) => snapshot.value);
  const errorCode = useSelector(
    actorRef,
    (snapshot) => snapshot.context.errorCode,
  );

  const hotkeyMap = useMemo(
    () => ({
      space: () => actorRef.send({ type: "TOGGLE" }),
      k: () => actorRef.send({ type: "TOGGLE" }),
      r: () => actorRef.send({ type: "REPEAT" }),
      n: () => actorRef.send({ type: "NEXT_CUE" }),
      p: () => actorRef.send({ type: "PREVIOUS_CUE" }),
      j: () =>
        actorRef.send({
          type: "SEEK",
          seconds: Math.max(
            0,
            actorRef.getSnapshot().context.currentSeconds - 10,
          ),
        }),
      l: () =>
        actorRef.send({
          type: "SEEK",
          seconds: actorRef.getSnapshot().context.currentSeconds + 10,
        }),
      s: () => actorRef.send({ type: "SKIP" }),
      t: () => {
        const seconds = actorRef.getSnapshot().context.currentSeconds;
        announce(
          t("announceCurrentTime", { time: formatClock(seconds), title }),
          "polite",
        );
      },
      "?": () => setShortcutsOpen(true),
    }),
    [actorRef, announce, t, title],
  );
  useHotkeys(hotkeyMap);

  if (topState === "error") {
    const { message, nextStep } = toUserMessage(toKnownErrorCode(errorCode));
    return (
      <div
        role="alert"
        className="flex flex-col gap-2 rounded-panel bg-surface-raised p-5"
      >
        <p className="m-0 text-lg font-bold">{message}</p>
        <p className="m-0 text-ink-muted">{nextStep}</p>
      </div>
    );
  }

  if (topState === "ended") {
    return <output className="block text-lg">{t("ended")}</output>;
  }

  return (
    <section
      aria-labelledby="narration-section-heading"
      className="flex flex-col gap-4"
    >
      <h2 id="narration-section-heading" className="visually-hidden">
        {t("narrationSectionHeading")}
      </h2>
      <ControlBar actorRef={actorRef} />
      <NowDescribing actorRef={actorRef} />
      <CueList actorRef={actorRef} cues={cues} />
      <ShortcutsDialog isOpen={shortcutsOpen} onOpenChange={setShortcutsOpen} />
    </section>
  );
}
