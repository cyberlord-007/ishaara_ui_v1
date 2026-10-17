import { and, assign, fromCallback, fromPromise, raise, setup } from "xstate";
import type { NarrationCue, QuestionAnswer } from "@/lib/api/schemas";
import type { Preferences } from "@/stores/preferencesStore";
import { mapYouTubePlayerErrorCode } from "../youtube/playerErrorCodes";
import { cuesBetween, findNextCue } from "./cueIndex";

/** Ports the player machine depends on, so tests use fakes. Never touches the DOM directly. */
export interface VideoPlayerPort {
  play(): void;
  pause(): void;
  seekTo(seconds: number): void;
  getCurrentTime(): number;
  setVolume(percent: number): void;
  onStateChange(
    listener: (state: "playing" | "paused" | "ended" | "buffering") => void,
  ): () => void;
}

export interface NarrationAudioPort {
  /** Resolves on `ended`. */
  play(url: string, rate: number): Promise<void>;
  stop(): void;
}

export type NarratedPlayerSettings = Pick<
  Preferences,
  "narrationOutput" | "narrationRate" | "autoPauseForCues" | "playEarcons"
>;

export interface NarratedPlayerContext {
  cues: readonly NarrationCue[];
  nextCueIndex: number;
  activeCue: NarrationCue | null;
  lastNarratedCue: NarrationCue | null;
  currentSeconds: number;
  settings: NarratedPlayerSettings;
  answer: QuestionAnswer | null;
  errorCode: string | null;
  /**
   * Where "stop narrating" returns to. Not part of the plan's literal
   * context shape — added because the spec's own rows disagree on this
   * otherwise (cue-triggered narration always returns to "playing"; an
   * ad-hoc Repeat from "paused" must return to "paused"). See
   * docs/DECISIONS.md.
   */
  resumeTo: "playing" | "paused";
}

export type NarratedPlayerEvent =
  | { type: "PLAYER_READY" }
  | { type: "PLAY" }
  | { type: "PAUSE" }
  | { type: "TOGGLE" }
  | { type: "TICK"; seconds: number }
  | { type: "SEEK"; seconds: number }
  | { type: "NEXT_CUE" }
  | { type: "PREVIOUS_CUE" }
  | { type: "JUMP_TO_CUE"; cueId: string }
  | { type: "REPEAT" }
  | { type: "SKIP" }
  | { type: "RESUME" }
  | { type: "NARRATION_ENDED" }
  | { type: "NARRATION_FAILED" }
  | { type: "ASK" }
  | { type: "ANSWER_RECEIVED"; answer: QuestionAnswer }
  | { type: "ANSWER_DONE" }
  | { type: "VIDEO_ENDED" }
  | { type: "PLAYER_ERROR"; code: number }
  | { type: "SETTINGS_CHANGED"; settings: NarratedPlayerSettings };

export interface NarratedPlayerInput {
  cues: readonly NarrationCue[];
  settings: NarratedPlayerSettings;
  initialSeekSeconds: number | null;
}

/** The cue that would become active for this event, given the current context. */
function cueToArm(
  context: NarratedPlayerContext,
  event: NarratedPlayerEvent,
): NarrationCue | null {
  switch (event.type) {
    case "TICK":
      return context.cues[context.nextCueIndex] ?? null;
    case "REPEAT":
      return context.lastNarratedCue;
    case "NEXT_CUE": {
      // Anchor past the currently armed cue (if re-arming mid-narration), not raw
      // playback position, which hasn't moved while narrating/paused.
      const anchor = context.activeCue
        ? context.activeCue.startSeconds
        : context.currentSeconds;
      const index = findNextCue(context.cues, anchor + 0.01);
      return context.cues[index] ?? null;
    }
    case "PREVIOUS_CUE": {
      const anchor = context.activeCue
        ? context.activeCue.startSeconds
        : context.currentSeconds;
      const priorCues = cuesBetween(context.cues, 0, anchor);
      return priorCues.at(-1) ?? null;
    }
    case "JUMP_TO_CUE":
      return context.cues.find((cue) => cue.cueId === event.cueId) ?? null;
    default:
      return context.activeCue;
  }
}

// No earcon assets exist yet in this environment; this is a best-effort no-op
// until public/earcons/ is populated. See docs/DECISIONS.md.
const EARCON_START_SRC = "/earcons/cue-start.wav";

function playEarcon(src: string): void {
  new Audio(src).play().catch(() => {});
}

/**
 * Builds the narrated-player state machine. Every row of the plan's
 * "Narrated player engine" transition table is a transition below;
 * `docs/DECISIONS.md` records the handful of places that table leaves
 * ambiguous and how this implementation resolves them.
 */
export function createNarratedPlayerMachine(ports: {
  video: VideoPlayerPort;
  audio: NarrationAudioPort;
}) {
  const playNarrationAudio = fromPromise<void, { url: string; rate: number }>(
    async ({ input, signal }) => {
      const stopOnAbort = () => ports.audio.stop();
      signal.addEventListener("abort", stopOnAbort);
      try {
        await ports.audio.play(input.url, input.rate);
      } finally {
        signal.removeEventListener("abort", stopOnAbort);
      }
    },
  );

  const pollClock = fromCallback<{ type: "TICK"; seconds: number }>(
    ({ sendBack }) => {
      const id = setInterval(() => {
        sendBack({ type: "TICK", seconds: ports.video.getCurrentTime() });
      }, 100);
      return () => clearInterval(id);
    },
  );

  const videoStateListener = fromCallback<{ type: "VIDEO_ENDED" }>(
    ({ sendBack }) =>
      ports.video.onStateChange((state) => {
        if (state === "ended") {
          sendBack({ type: "VIDEO_ENDED" });
        }
      }),
  );

  return setup({
    types: {
      context: {} as NarratedPlayerContext,
      events: {} as NarratedPlayerEvent,
      input: {} as NarratedPlayerInput,
    },
    actors: { playNarrationAudio, pollClock, videoStateListener },
    guards: {
      autoPauseEnabled: ({ context }) => context.settings.autoPauseForCues,
      cueDue: ({ context, event }) => {
        if (event.type !== "TICK") {
          return false;
        }
        const cue = context.cues[context.nextCueIndex];
        return cue != null && event.seconds >= cue.startSeconds - 0.15;
      },
      shouldAwaitResume: ({ context, event }) => {
        const cue = cueToArm(context, event);
        return (
          context.settings.narrationOutput === "screen_reader" || !cue?.audioUrl
        );
      },
      hasLastNarratedCue: ({ context }) => context.lastNarratedCue != null,
      resumeToIsPlaying: ({ context }) => context.resumeTo === "playing",
    },
    actions: {
      armCue: assign(({ context, event }) => {
        const cue = cueToArm(context, event);
        if (!cue) {
          return { activeCue: null };
        }
        return { activeCue: cue, nextCueIndex: context.cues.indexOf(cue) + 1 };
      }),
      seekToArmedCueMinusTwo: ({ context }) => {
        if (context.activeCue) {
          ports.video.seekTo(Math.max(0, context.activeCue.startSeconds - 2));
        }
      },
      setResumeToPlaying: assign({ resumeTo: "playing" as const }),
      setResumeToPaused: assign({ resumeTo: "paused" as const }),
      markCueDoneAndAdvance: assign(({ context }) => {
        if (!context.activeCue) {
          return {};
        }
        const index = context.cues.indexOf(context.activeCue);
        return {
          lastNarratedCue: context.activeCue,
          activeCue: null,
          nextCueIndex: Math.max(context.nextCueIndex, index + 1),
        };
      }),
      handleSeek: assign(({ context, event }) => {
        if (event.type !== "SEEK") {
          return {};
        }
        ports.video.seekTo(event.seconds);
        return {
          currentSeconds: event.seconds,
          nextCueIndex: findNextCue(context.cues, event.seconds),
        };
      }),
      recordTick: assign(({ event }) =>
        event.type === "TICK" ? { currentSeconds: event.seconds } : {},
      ),
      narrateDuckedAndAdvance: ({ context }) => {
        const cue = context.cues[context.nextCueIndex];
        if (!cue) {
          return;
        }
        ports.video.setVolume(30);
        if (context.settings.narrationOutput === "audio" && cue.audioUrl) {
          ports.audio
            .play(cue.audioUrl, context.settings.narrationRate)
            .catch(() => {})
            .finally(() => ports.video.setVolume(100));
        } else {
          ports.video.setVolume(100);
        }
      },
      advancePastDuckedCue: assign(({ context }) => {
        const cue = context.cues[context.nextCueIndex];
        return cue
          ? { lastNarratedCue: cue, nextCueIndex: context.nextCueIndex + 1 }
          : {};
      }),
      playEarconStart: ({ context }) => {
        if (context.settings.playEarcons) {
          playEarcon(EARCON_START_SRC);
        }
      },
      setAnswer: assign(({ event }) =>
        event.type === "ANSWER_RECEIVED" ? { answer: event.answer } : {},
      ),
      playAnswerAudioIfAny: ({ context }) => {
        if (context.answer?.answerAudioUrl) {
          ports.audio
            .play(context.answer.answerAudioUrl, context.settings.narrationRate)
            .catch(() => {});
        }
      },
      stopAnswerAudio: () => ports.audio.stop(),
      clearAnswer: assign({ answer: null }),
      handlePlayerError: assign(({ event }) =>
        event.type === "PLAYER_ERROR"
          ? { errorCode: mapYouTubePlayerErrorCode(event.code) }
          : {},
      ),
      updateSettings: assign(({ event }) =>
        event.type === "SETTINGS_CHANGED" ? { settings: event.settings } : {},
      ),
    },
  }).createMachine({
    id: "narratedPlayer",
    context: ({ input }) => ({
      cues: input.cues,
      nextCueIndex: findNextCue(input.cues, input.initialSeekSeconds ?? 0),
      activeCue: null,
      lastNarratedCue: null,
      currentSeconds: input.initialSeekSeconds ?? 0,
      settings: input.settings,
      answer: null,
      errorCode: null,
      resumeTo: "playing",
    }),
    invoke: { id: "videoStateListener", src: "videoStateListener" },
    initial: "loading",
    on: {
      SETTINGS_CHANGED: { actions: "updateSettings" },
      PLAYER_ERROR: { target: ".error", actions: "handlePlayerError" },
    },
    states: {
      loading: {
        on: {
          PLAYER_READY: {
            target: "paused",
            actions: ({ context }) => {
              if (context.currentSeconds > 0) {
                ports.video.seekTo(context.currentSeconds);
              }
            },
          },
        },
      },
      paused: {
        entry: () => ports.video.pause(),
        on: {
          PLAY: { target: "playing" },
          TOGGLE: { target: "playing" },
          REPEAT: [
            {
              guard: and(["hasLastNarratedCue", "shouldAwaitResume"]),
              target: "narrating.awaitingResume",
              reenter: true,
              actions: ["setResumeToPaused", "armCue"],
            },
            {
              guard: "hasLastNarratedCue",
              target: "narrating.speaking",
              reenter: true,
              actions: ["setResumeToPaused", "armCue"],
            },
          ],
          SEEK: { actions: "handleSeek" },
          NEXT_CUE: [
            {
              guard: "shouldAwaitResume",
              target: "narrating.awaitingResume",
              reenter: true,
              actions: [
                "setResumeToPaused",
                "armCue",
                "seekToArmedCueMinusTwo",
              ],
            },
            {
              target: "narrating.speaking",
              reenter: true,
              actions: [
                "setResumeToPaused",
                "armCue",
                "seekToArmedCueMinusTwo",
              ],
            },
          ],
          PREVIOUS_CUE: [
            {
              guard: "shouldAwaitResume",
              target: "narrating.awaitingResume",
              reenter: true,
              actions: [
                "setResumeToPaused",
                "armCue",
                "seekToArmedCueMinusTwo",
              ],
            },
            {
              target: "narrating.speaking",
              reenter: true,
              actions: [
                "setResumeToPaused",
                "armCue",
                "seekToArmedCueMinusTwo",
              ],
            },
          ],
          JUMP_TO_CUE: [
            {
              guard: "shouldAwaitResume",
              target: "narrating.awaitingResume",
              reenter: true,
              actions: [
                "setResumeToPaused",
                "armCue",
                "seekToArmedCueMinusTwo",
              ],
            },
            {
              target: "narrating.speaking",
              reenter: true,
              actions: [
                "setResumeToPaused",
                "armCue",
                "seekToArmedCueMinusTwo",
              ],
            },
          ],
          ASK: { target: "asking" },
        },
      },
      playing: {
        entry: () => ports.video.play(),
        invoke: { id: "poll", src: "pollClock" },
        on: {
          TICK: [
            {
              guard: and(["cueDue", "autoPauseEnabled", "shouldAwaitResume"]),
              target: "narrating.awaitingResume",
              reenter: true,
              actions: ["recordTick", "setResumeToPlaying", "armCue"],
            },
            {
              guard: and(["cueDue", "autoPauseEnabled"]),
              target: "narrating.speaking",
              reenter: true,
              actions: ["recordTick", "setResumeToPlaying", "armCue"],
            },
            {
              guard: "cueDue",
              actions: [
                "recordTick",
                "narrateDuckedAndAdvance",
                "advancePastDuckedCue",
              ],
            },
            { actions: "recordTick" },
          ],
          PAUSE: { target: "paused" },
          TOGGLE: { target: "paused" },
          REPEAT: [
            {
              guard: and(["hasLastNarratedCue", "shouldAwaitResume"]),
              target: "narrating.awaitingResume",
              reenter: true,
              actions: ["setResumeToPlaying", "armCue"],
            },
            {
              guard: "hasLastNarratedCue",
              target: "narrating.speaking",
              reenter: true,
              actions: ["setResumeToPlaying", "armCue"],
            },
          ],
          SEEK: { actions: "handleSeek" },
          NEXT_CUE: [
            {
              guard: "shouldAwaitResume",
              target: "narrating.awaitingResume",
              reenter: true,
              actions: [
                "setResumeToPlaying",
                "armCue",
                "seekToArmedCueMinusTwo",
              ],
            },
            {
              target: "narrating.speaking",
              reenter: true,
              actions: [
                "setResumeToPlaying",
                "armCue",
                "seekToArmedCueMinusTwo",
              ],
            },
          ],
          PREVIOUS_CUE: [
            {
              guard: "shouldAwaitResume",
              target: "narrating.awaitingResume",
              reenter: true,
              actions: [
                "setResumeToPlaying",
                "armCue",
                "seekToArmedCueMinusTwo",
              ],
            },
            {
              target: "narrating.speaking",
              reenter: true,
              actions: [
                "setResumeToPlaying",
                "armCue",
                "seekToArmedCueMinusTwo",
              ],
            },
          ],
          JUMP_TO_CUE: [
            {
              guard: "shouldAwaitResume",
              target: "narrating.awaitingResume",
              reenter: true,
              actions: [
                "setResumeToPlaying",
                "armCue",
                "seekToArmedCueMinusTwo",
              ],
            },
            {
              target: "narrating.speaking",
              reenter: true,
              actions: [
                "setResumeToPlaying",
                "armCue",
                "seekToArmedCueMinusTwo",
              ],
            },
          ],
          ASK: { target: "asking" },
          VIDEO_ENDED: { target: "ended" },
        },
      },
      narrating: {
        entry: () => ports.video.pause(),
        initial: "speaking",
        on: {
          SEEK: { actions: "handleSeek" },
          NEXT_CUE: [
            {
              guard: "shouldAwaitResume",
              target: "narrating.awaitingResume",
              reenter: true,
              actions: ["armCue", "seekToArmedCueMinusTwo"],
            },
            {
              target: "narrating.speaking",
              reenter: true,
              actions: ["armCue", "seekToArmedCueMinusTwo"],
            },
          ],
          PREVIOUS_CUE: [
            {
              guard: "shouldAwaitResume",
              target: "narrating.awaitingResume",
              reenter: true,
              actions: ["armCue", "seekToArmedCueMinusTwo"],
            },
            {
              target: "narrating.speaking",
              reenter: true,
              actions: ["armCue", "seekToArmedCueMinusTwo"],
            },
          ],
          JUMP_TO_CUE: [
            {
              guard: "shouldAwaitResume",
              target: "narrating.awaitingResume",
              reenter: true,
              actions: ["armCue", "seekToArmedCueMinusTwo"],
            },
            {
              target: "narrating.speaking",
              reenter: true,
              actions: ["armCue", "seekToArmedCueMinusTwo"],
            },
          ],
          ASK: { target: "asking" },
          NARRATION_ENDED: [
            {
              guard: "resumeToIsPlaying",
              target: "playing",
              actions: "markCueDoneAndAdvance",
            },
            { target: "paused", actions: "markCueDoneAndAdvance" },
          ],
          SKIP: [
            {
              guard: "resumeToIsPlaying",
              target: "playing",
              actions: "markCueDoneAndAdvance",
            },
            { target: "paused", actions: "markCueDoneAndAdvance" },
          ],
          RESUME: [
            {
              guard: "resumeToIsPlaying",
              target: "playing",
              actions: "markCueDoneAndAdvance",
            },
            { target: "paused", actions: "markCueDoneAndAdvance" },
          ],
          TOGGLE: {
            target: "playing",
            actions: ["setResumeToPlaying", "markCueDoneAndAdvance"],
          },
        },
        states: {
          speaking: {
            entry: "playEarconStart",
            invoke: {
              id: "narrationAudio",
              src: "playNarrationAudio",
              input: ({ context }) => ({
                url: context.activeCue?.audioUrl ?? "",
                rate: context.settings.narrationRate,
              }),
              onDone: { actions: raise({ type: "NARRATION_ENDED" }) },
              onError: { actions: raise({ type: "NARRATION_FAILED" }) },
            },
            on: {
              REPEAT: { target: "speaking", reenter: true },
              NARRATION_FAILED: { target: "awaitingResume" },
            },
          },
          awaitingResume: {
            on: { REPEAT: { target: "speaking", reenter: true } },
          },
        },
      },
      asking: {
        entry: () => ports.video.pause(),
        initial: "waiting",
        states: {
          waiting: {
            on: {
              ANSWER_RECEIVED: {
                target: "answering",
                actions: ["setAnswer", "playAnswerAudioIfAny"],
              },
            },
          },
          answering: {
            on: {
              ANSWER_DONE: {
                target: "#narratedPlayer.paused",
                actions: ["stopAnswerAudio", "clearAnswer"],
              },
            },
          },
        },
      },
      ended: {},
      error: {},
    },
  });
}
