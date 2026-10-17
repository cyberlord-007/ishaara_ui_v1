import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactElement } from "react";
import { describe, expect, it, vi } from "vitest";
import { createActor } from "xstate";
import type { NarrationCue } from "@/lib/api/schemas";
import { IntlProvider } from "@/providers/IntlProvider";
import {
  createNarratedPlayerMachine,
  type NarratedPlayerSettings,
} from "../machine/narratedPlayerMachine";
import { ControlBar } from "./ControlBar";

function renderWithProviders(node: ReactElement) {
  return render(<IntlProvider>{node}</IntlProvider>);
}

function makeCue(cueId: string, startSeconds: number): NarrationCue {
  return {
    cueId,
    startSeconds,
    spokenPhrase: "this",
    referentKind: "text",
    boardDescription: "",
    gapSummary: "",
    narrationText: `narrating ${cueId}`,
    audioUrl: `${cueId}.mp3`,
    audioDurationSeconds: 2,
    confidence: 1,
  };
}

const SETTINGS: NarratedPlayerSettings = {
  narrationOutput: "audio",
  narrationRate: 1,
  autoPauseForCues: true,
  playEarcons: false,
};

function createTestActor(cues: NarrationCue[]) {
  const video = {
    play: vi.fn(),
    pause: vi.fn(),
    seekTo: vi.fn(),
    getCurrentTime: vi.fn(() => 0),
    setVolume: vi.fn(),
    onStateChange: vi.fn(() => () => {}),
  };
  const audio = {
    play: vi.fn(() => new Promise<void>(() => {})),
    stop: vi.fn(),
  };
  const machine = createNarratedPlayerMachine({ video, audio });
  const actor = createActor(machine, {
    input: { cues, settings: SETTINGS, initialSeekSeconds: null },
  });
  actor.start();
  actor.send({ type: "PLAYER_READY" });
  return { actor, video };
}

describe("ControlBar", () => {
  it("toggles play/pause, showing the right label and calling the port", async () => {
    const user = userEvent.setup();
    const { actor, video } = createTestActor([makeCue("a", 10)]);
    renderWithProviders(<ControlBar actorRef={actor} />);

    await user.click(screen.getByRole("button", { name: "Play" }));
    expect(video.play).toHaveBeenCalled();
    expect(await screen.findByRole("button", { name: "Pause" })).toBeTruthy();
  });

  it("seeks forward and back by 10 seconds", async () => {
    const user = userEvent.setup();
    const { actor, video } = createTestActor([]);
    renderWithProviders(<ControlBar actorRef={actor} />);

    await user.click(
      screen.getByRole("button", { name: "Forward 10 seconds" }),
    );
    expect(video.seekTo).toHaveBeenCalledWith(10);

    await user.click(screen.getByRole("button", { name: "Back 10 seconds" }));
    expect(video.seekTo).toHaveBeenCalledWith(0);
  });

  it("dispatches NEXT_CUE and PREVIOUS_CUE from their buttons", async () => {
    const user = userEvent.setup();
    const { actor, video } = createTestActor([makeCue("a", 10)]);
    renderWithProviders(<ControlBar actorRef={actor} />);

    await user.click(screen.getByRole("button", { name: "Next description" }));
    expect(video.seekTo).toHaveBeenCalledWith(8);
  });
});
