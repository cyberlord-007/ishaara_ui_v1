import { afterEach, describe, expect, it, vi } from "vitest";
import { createActor } from "xstate";
import type { NarrationCue } from "@/lib/api/schemas";
import {
  createNarratedPlayerMachine,
  type NarratedPlayerSettings,
} from "./narratedPlayerMachine";

function makeCue(
  cueId: string,
  startSeconds: number,
  audioUrl: string | null = `${cueId}.mp3`,
): NarrationCue {
  return {
    cueId,
    startSeconds,
    spokenPhrase: "this",
    referentKind: "text",
    boardDescription: "",
    gapSummary: "",
    narrationText: `narrating ${cueId}`,
    audioUrl,
    audioDurationSeconds: audioUrl ? 2 : null,
    confidence: 1,
  };
}

const DEFAULT_SETTINGS: NarratedPlayerSettings = {
  narrationOutput: "audio",
  narrationRate: 1,
  autoPauseForCues: true,
  playEarcons: false,
};

type VideoState = "playing" | "paused" | "ended" | "buffering";

function createFakeVideoPort(currentTime = 0) {
  const listeners = new Set<(state: VideoState) => void>();
  return {
    play: vi.fn(),
    pause: vi.fn(),
    seekTo: vi.fn(),
    getCurrentTime: vi.fn(() => currentTime),
    setVolume: vi.fn(),
    onStateChange: vi.fn((listener: (state: VideoState) => void) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    }),
    emitState(state: VideoState) {
      for (const listener of listeners) {
        listener(state);
      }
    },
  };
}

function createFakeAudioPort() {
  let settle: { resolve: () => void; reject: (error: Error) => void } | null =
    null;
  return {
    play: vi.fn((_url: string, _rate: number) => {
      return new Promise<void>((resolve, reject) => {
        settle = { resolve, reject };
      });
    }),
    stop: vi.fn(),
    resolveCurrent() {
      settle?.resolve();
    },
    rejectCurrent(error: Error) {
      settle?.reject(error);
    },
  };
}

function createTestActor(
  cues: readonly NarrationCue[],
  options?: {
    settings?: Partial<NarratedPlayerSettings>;
    initialSeekSeconds?: number | null;
  },
) {
  const video = createFakeVideoPort();
  const audio = createFakeAudioPort();
  const machine = createNarratedPlayerMachine({ video, audio });
  const actor = createActor(machine, {
    input: {
      cues,
      settings: { ...DEFAULT_SETTINGS, ...options?.settings },
      initialSeekSeconds: options?.initialSeekSeconds ?? null,
    },
  });
  actor.start();
  return { actor, video, audio };
}

describe("createNarratedPlayerMachine", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("starts loading, then PLAYER_READY moves to paused without seeking when there is no initial offset", () => {
    const { actor, video } = createTestActor([makeCue("a", 10)]);
    expect(actor.getSnapshot().value).toBe("loading");
    actor.send({ type: "PLAYER_READY" });
    expect(actor.getSnapshot().value).toBe("paused");
    expect(video.seekTo).not.toHaveBeenCalled();
  });

  it("seeks to the ?t= offset on PLAYER_READY and arms the first cue at or after it", () => {
    const cues = [makeCue("a", 10), makeCue("b", 40)];
    const { actor, video } = createTestActor(cues, { initialSeekSeconds: 20 });
    actor.send({ type: "PLAYER_READY" });
    expect(video.seekTo).toHaveBeenCalledWith(20);
    expect(actor.getSnapshot().context.nextCueIndex).toBe(1);
  });

  it("PLAY and TOGGLE move paused to playing and call video.play()", () => {
    const { actor, video } = createTestActor([]);
    actor.send({ type: "PLAYER_READY" });
    actor.send({ type: "PLAY" });
    expect(actor.getSnapshot().value).toBe("playing");
    expect(video.play).toHaveBeenCalled();
  });

  it("PAUSE and TOGGLE move playing back to paused and call video.pause()", () => {
    const { actor, video } = createTestActor([]);
    actor.send({ type: "PLAYER_READY" });
    actor.send({ type: "PLAY" });
    actor.send({ type: "TOGGLE" });
    expect(actor.getSnapshot().value).toBe("paused");
    expect(video.pause).toHaveBeenCalled();
  });

  it("a due cue with autoPauseForCues on enters narrating.speaking with resumeTo playing", () => {
    const cues = [makeCue("a", 10)];
    const { actor, video } = createTestActor(cues);
    actor.send({ type: "PLAYER_READY" });
    actor.send({ type: "PLAY" });
    actor.send({ type: "TICK", seconds: 10 });
    expect(actor.getSnapshot().value).toEqual({ narrating: "speaking" });
    expect(actor.getSnapshot().context.resumeTo).toBe("playing");
    expect(actor.getSnapshot().context.activeCue?.cueId).toBe("a");
    expect(video.pause).toHaveBeenCalled();
  });

  it("awaits resume instead of speaking when narrationOutput is screen_reader", () => {
    const cues = [makeCue("a", 10)];
    const { actor } = createTestActor(cues, {
      settings: { narrationOutput: "screen_reader" },
    });
    actor.send({ type: "PLAYER_READY" });
    actor.send({ type: "PLAY" });
    actor.send({ type: "TICK", seconds: 10 });
    expect(actor.getSnapshot().value).toEqual({ narrating: "awaitingResume" });
  });

  it("awaits resume when the due cue has no audioUrl, even with audio output selected", () => {
    const cues = [makeCue("a", 10, null)];
    const { actor } = createTestActor(cues);
    actor.send({ type: "PLAYER_READY" });
    actor.send({ type: "PLAY" });
    actor.send({ type: "TICK", seconds: 10 });
    expect(actor.getSnapshot().value).toEqual({ narrating: "awaitingResume" });
  });

  it("ducks and narrates over the video without pausing when autoPauseForCues is off", () => {
    const cues = [makeCue("a", 10), makeCue("b", 40)];
    const { actor, video, audio } = createTestActor(cues, {
      settings: { autoPauseForCues: false },
    });
    actor.send({ type: "PLAYER_READY" });
    actor.send({ type: "PLAY" });
    actor.send({ type: "TICK", seconds: 10 });
    expect(actor.getSnapshot().value).toBe("playing");
    expect(video.setVolume).toHaveBeenCalledWith(30);
    expect(audio.play).toHaveBeenCalledWith("a.mp3", 1);
    expect(actor.getSnapshot().context.lastNarratedCue?.cueId).toBe("a");
    expect(actor.getSnapshot().context.nextCueIndex).toBe(1);
  });

  it("a TICK before the next cue is due just records the current time", () => {
    const cues = [makeCue("a", 10)];
    const { actor } = createTestActor(cues);
    actor.send({ type: "PLAYER_READY" });
    actor.send({ type: "PLAY" });
    actor.send({ type: "TICK", seconds: 3 });
    expect(actor.getSnapshot().value).toBe("playing");
    expect(actor.getSnapshot().context.currentSeconds).toBe(3);
  });

  it("NARRATION_ENDED returns to playing when resumeTo is playing, and marks the cue done", () => {
    const cues = [makeCue("a", 10)];
    const { actor } = createTestActor(cues);
    actor.send({ type: "PLAYER_READY" });
    actor.send({ type: "PLAY" });
    actor.send({ type: "TICK", seconds: 10 });
    actor.send({ type: "NARRATION_ENDED" });
    expect(actor.getSnapshot().value).toBe("playing");
    expect(actor.getSnapshot().context.activeCue).toBeNull();
    expect(actor.getSnapshot().context.lastNarratedCue?.cueId).toBe("a");
  });

  it("an ad-hoc REPEAT from paused returns to paused (not playing) when narration ends", () => {
    const cues = [makeCue("a", 10)];
    const { actor } = createTestActor(cues);
    actor.send({ type: "PLAYER_READY" });
    actor.send({ type: "PLAY" });
    actor.send({ type: "TICK", seconds: 10 });
    actor.send({ type: "NARRATION_ENDED" });
    actor.send({ type: "PAUSE" });
    actor.send({ type: "REPEAT" });
    expect(actor.getSnapshot().value).toEqual({ narrating: "speaking" });
    expect(actor.getSnapshot().context.resumeTo).toBe("paused");
    actor.send({ type: "NARRATION_ENDED" });
    expect(actor.getSnapshot().value).toBe("paused");
  });

  it("REPEAT is a no-op in paused when nothing has been narrated yet", () => {
    const { actor } = createTestActor([makeCue("a", 10)]);
    actor.send({ type: "PLAYER_READY" });
    actor.send({ type: "REPEAT" });
    expect(actor.getSnapshot().value).toBe("paused");
  });

  it("REPEAT while awaitingResume re-enters speaking and restarts narration audio", () => {
    const cues = [makeCue("a", 10)];
    const { actor, audio } = createTestActor(cues, {
      settings: { narrationOutput: "screen_reader" },
    });
    actor.send({ type: "PLAYER_READY" });
    actor.send({ type: "PLAY" });
    actor.send({ type: "TICK", seconds: 10 });
    expect(actor.getSnapshot().value).toEqual({ narrating: "awaitingResume" });
    actor.send({ type: "REPEAT" });
    expect(actor.getSnapshot().value).toEqual({ narrating: "speaking" });
    expect(audio.play).toHaveBeenCalledTimes(1);
  });

  it("NARRATION_FAILED moves speaking to awaitingResume without losing the active cue", () => {
    const cues = [makeCue("a", 10)];
    const { actor } = createTestActor(cues);
    actor.send({ type: "PLAYER_READY" });
    actor.send({ type: "PLAY" });
    actor.send({ type: "TICK", seconds: 10 });
    actor.send({ type: "NARRATION_FAILED" });
    expect(actor.getSnapshot().value).toEqual({ narrating: "awaitingResume" });
    expect(actor.getSnapshot().context.activeCue?.cueId).toBe("a");
  });

  it("a real narration-audio rejection raises NARRATION_FAILED through the invoked actor", () => {
    const cues = [makeCue("a", 10)];
    const { actor, audio } = createTestActor(cues);
    actor.send({ type: "PLAYER_READY" });
    actor.send({ type: "PLAY" });
    actor.send({ type: "TICK", seconds: 10 });
    audio.rejectCurrent(new Error("autoplay blocked"));
    return vi.waitFor(() => {
      expect(actor.getSnapshot().value).toEqual({
        narrating: "awaitingResume",
      });
    });
  });

  it("a real narration-audio completion raises NARRATION_ENDED through the invoked actor", () => {
    const cues = [makeCue("a", 10)];
    const { actor, audio } = createTestActor(cues);
    actor.send({ type: "PLAYER_READY" });
    actor.send({ type: "PLAY" });
    actor.send({ type: "TICK", seconds: 10 });
    audio.resolveCurrent();
    return vi.waitFor(() => {
      expect(actor.getSnapshot().value).toBe("playing");
    });
  });

  it("stops the narration-audio actor as soon as speaking is exited, for any reason", () => {
    const cues = [makeCue("a", 10)];
    const { actor, audio } = createTestActor(cues);
    actor.send({ type: "PLAYER_READY" });
    actor.send({ type: "PLAY" });
    actor.send({ type: "TICK", seconds: 10 });
    actor.send({ type: "TOGGLE" });
    expect(audio.stop).toHaveBeenCalled();
  });

  it("SKIP exits narrating to resumeTo and marks the cue done", () => {
    const cues = [makeCue("a", 10)];
    const { actor } = createTestActor(cues);
    actor.send({ type: "PLAYER_READY" });
    actor.send({ type: "PLAY" });
    actor.send({ type: "TICK", seconds: 10 });
    actor.send({ type: "SKIP" });
    expect(actor.getSnapshot().value).toBe("playing");
    expect(actor.getSnapshot().context.lastNarratedCue?.cueId).toBe("a");
  });

  it("RESUME fired while still speaking behaves like SKIP", () => {
    const cues = [makeCue("a", 10)];
    const { actor } = createTestActor(cues);
    actor.send({ type: "PLAYER_READY" });
    actor.send({ type: "PLAY" });
    actor.send({ type: "TICK", seconds: 10 });
    actor.send({ type: "RESUME" });
    expect(actor.getSnapshot().value).toBe("playing");
  });

  it("TOGGLE during narrating always forces playing, even when resumeTo is paused", () => {
    const cues = [makeCue("a", 10)];
    const { actor } = createTestActor(cues);
    actor.send({ type: "PLAYER_READY" });
    actor.send({ type: "NEXT_CUE" });
    expect(actor.getSnapshot().value).toEqual({ narrating: "speaking" });
    expect(actor.getSnapshot().context.resumeTo).toBe("paused");
    actor.send({ type: "TOGGLE" });
    expect(actor.getSnapshot().value).toBe("playing");
  });

  it("SEEK updates position and the next-cue index and calls video.seekTo", () => {
    const cues = [makeCue("a", 10), makeCue("b", 40)];
    const { actor, video } = createTestActor(cues);
    actor.send({ type: "PLAYER_READY" });
    actor.send({ type: "PLAY" });
    actor.send({ type: "SEEK", seconds: 20 });
    expect(video.seekTo).toHaveBeenCalledWith(20);
    expect(actor.getSnapshot().context.nextCueIndex).toBe(1);
    expect(actor.getSnapshot().context.currentSeconds).toBe(20);
  });

  it("a seek past several cues skips them rather than queuing them", () => {
    const cues = [
      makeCue("a", 10),
      makeCue("b", 20),
      makeCue("c", 30),
      makeCue("d", 60),
    ];
    const { actor } = createTestActor(cues);
    actor.send({ type: "PLAYER_READY" });
    actor.send({ type: "PLAY" });
    actor.send({ type: "SEEK", seconds: 45 });
    expect(actor.getSnapshot().context.nextCueIndex).toBe(3);
    actor.send({ type: "TICK", seconds: 45 });
    expect(actor.getSnapshot().value).toBe("playing");
  });

  it("SEEK while narrating leaves narration running and only updates future-cue bookkeeping", () => {
    const cues = [makeCue("a", 10), makeCue("b", 40)];
    const { actor } = createTestActor(cues);
    actor.send({ type: "PLAYER_READY" });
    actor.send({ type: "PLAY" });
    actor.send({ type: "TICK", seconds: 10 });
    actor.send({ type: "SEEK", seconds: 35 });
    expect(actor.getSnapshot().value).toEqual({ narrating: "speaking" });
    expect(actor.getSnapshot().context.nextCueIndex).toBe(1);
  });

  it("NEXT_CUE from paused arms the next cue, seeks 2s early, and preserves resumeTo paused", () => {
    const cues = [makeCue("a", 10), makeCue("b", 40)];
    const { actor, video } = createTestActor(cues);
    actor.send({ type: "PLAYER_READY" });
    actor.send({ type: "NEXT_CUE" });
    expect(actor.getSnapshot().value).toEqual({ narrating: "speaking" });
    expect(actor.getSnapshot().context.activeCue?.cueId).toBe("a");
    expect(video.seekTo).toHaveBeenCalledWith(8);
    actor.send({ type: "NARRATION_ENDED" });
    expect(actor.getSnapshot().value).toBe("paused");
  });

  it("PREVIOUS_CUE from playing finds the last cue before the current position", () => {
    const cues = [makeCue("a", 10), makeCue("b", 20), makeCue("c", 30)];
    const { actor } = createTestActor(cues);
    actor.send({ type: "PLAYER_READY" });
    actor.send({ type: "PLAY" });
    actor.send({ type: "SEEK", seconds: 25 });
    actor.send({ type: "PREVIOUS_CUE" });
    expect(actor.getSnapshot().context.activeCue?.cueId).toBe("b");
    expect(actor.getSnapshot().context.resumeTo).toBe("playing");
  });

  it("re-arming via NEXT_CUE while already narrating preserves resumeTo instead of resetting it", () => {
    const cues = [makeCue("a", 10), makeCue("b", 20), makeCue("c", 30)];
    const { actor } = createTestActor(cues);
    actor.send({ type: "PLAYER_READY" });
    actor.send({ type: "NEXT_CUE" });
    expect(actor.getSnapshot().context.resumeTo).toBe("paused");
    actor.send({ type: "NEXT_CUE" });
    expect(actor.getSnapshot().context.activeCue?.cueId).toBe("b");
    expect(actor.getSnapshot().context.resumeTo).toBe("paused");
  });

  it("JUMP_TO_CUE from paused arms the exact cue by id, not just the adjacent one", () => {
    const cues = [makeCue("a", 10), makeCue("b", 20), makeCue("c", 30)];
    const { actor, video } = createTestActor(cues);
    actor.send({ type: "PLAYER_READY" });
    actor.send({ type: "JUMP_TO_CUE", cueId: "c" });
    expect(actor.getSnapshot().value).toEqual({ narrating: "speaking" });
    expect(actor.getSnapshot().context.activeCue?.cueId).toBe("c");
    expect(video.seekTo).toHaveBeenCalledWith(28);
    expect(actor.getSnapshot().context.resumeTo).toBe("paused");
  });

  it("JUMP_TO_CUE while already narrating re-arms the named cue and preserves resumeTo", () => {
    const cues = [makeCue("a", 10), makeCue("b", 20), makeCue("c", 30)];
    const { actor } = createTestActor(cues);
    actor.send({ type: "PLAYER_READY" });
    actor.send({ type: "PLAY" });
    actor.send({ type: "JUMP_TO_CUE", cueId: "a" });
    expect(actor.getSnapshot().context.resumeTo).toBe("playing");
    actor.send({ type: "JUMP_TO_CUE", cueId: "c" });
    expect(actor.getSnapshot().context.activeCue?.cueId).toBe("c");
    expect(actor.getSnapshot().context.resumeTo).toBe("playing");
  });

  it("JUMP_TO_CUE to an unknown cue id arms nothing and awaits resume", () => {
    const cues = [makeCue("a", 10)];
    const { actor } = createTestActor(cues);
    actor.send({ type: "PLAYER_READY" });
    actor.send({ type: "JUMP_TO_CUE", cueId: "does-not-exist" });
    expect(actor.getSnapshot().value).toEqual({ narrating: "awaitingResume" });
    expect(actor.getSnapshot().context.activeCue).toBeNull();
  });

  it("ASK pauses the video and moves to asking from playing, paused, or narrating", () => {
    const { actor, video } = createTestActor([makeCue("a", 10)]);
    actor.send({ type: "PLAYER_READY" });
    actor.send({ type: "ASK" });
    expect(actor.getSnapshot().value).toEqual({ asking: "waiting" });
    expect(video.pause).toHaveBeenCalled();
  });

  it("ANSWER_RECEIVED plays the answer audio and ANSWER_DONE returns to paused and clears it", () => {
    const { actor, audio } = createTestActor([]);
    actor.send({ type: "PLAYER_READY" });
    actor.send({ type: "ASK" });
    actor.send({
      type: "ANSWER_RECEIVED",
      answer: {
        answerText: "It's a derivative.",
        answerAudioUrl: "answer.mp3",
        referencedSeconds: [10],
      },
    });
    expect(actor.getSnapshot().value).toEqual({ asking: "answering" });
    expect(audio.play).toHaveBeenCalledWith("answer.mp3", 1);
    actor.send({ type: "ANSWER_DONE" });
    expect(actor.getSnapshot().value).toBe("paused");
    expect(actor.getSnapshot().context.answer).toBeNull();
    expect(audio.stop).toHaveBeenCalled();
  });

  it("VIDEO_ENDED reported by the video port ends playback", () => {
    const { actor, video } = createTestActor([]);
    actor.send({ type: "PLAYER_READY" });
    actor.send({ type: "PLAY" });
    video.emitState("ended");
    expect(actor.getSnapshot().value).toBe("ended");
  });

  it("PLAYER_ERROR maps the YouTube code and moves to error from any state", () => {
    const { actor } = createTestActor([]);
    actor.send({ type: "PLAYER_READY" });
    actor.send({ type: "PLAYER_ERROR", code: 101 });
    expect(actor.getSnapshot().value).toBe("error");
    expect(actor.getSnapshot().context.errorCode).toBe("video_not_embeddable");
  });

  it("SETTINGS_CHANGED updates context and applies to the next narrated cue, not the current one", () => {
    const cues = [makeCue("a", 10), makeCue("b", 20)];
    const { actor, audio } = createTestActor(cues);
    actor.send({ type: "PLAYER_READY" });
    actor.send({ type: "PLAY" });
    actor.send({ type: "TICK", seconds: 10 });
    actor.send({
      type: "SETTINGS_CHANGED",
      settings: { ...DEFAULT_SETTINGS, narrationRate: 1.5 },
    });
    expect(audio.play).toHaveBeenCalledWith("a.mp3", 1);
    actor.send({ type: "NARRATION_ENDED" });
    actor.send({ type: "TICK", seconds: 20 });
    expect(audio.play).toHaveBeenCalledWith("b.mp3", 1.5);
  });

  it("the 100ms poll only runs while playing and stops once paused", () => {
    vi.useFakeTimers();
    const { actor, video } = createTestActor([]);
    actor.send({ type: "PLAYER_READY" });
    actor.send({ type: "PLAY" });
    vi.advanceTimersByTime(250);
    expect(video.getCurrentTime.mock.calls.length).toBeGreaterThanOrEqual(2);
    const callsWhilePlaying = video.getCurrentTime.mock.calls.length;
    actor.send({ type: "PAUSE" });
    vi.advanceTimersByTime(250);
    expect(video.getCurrentTime.mock.calls.length).toBe(callsWhilePlaying);
  });
});
