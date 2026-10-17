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
import { CueList } from "./CueList";

function renderWithProviders(node: ReactElement) {
  return render(<IntlProvider>{node}</IntlProvider>);
}

function makeCue(cueId: string, startSeconds: number): NarrationCue {
  return {
    cueId,
    startSeconds,
    spokenPhrase: `phrase ${cueId}`,
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

describe("CueList", () => {
  it("shows the empty state when there are no cues", () => {
    const { actor } = createTestActor([]);
    renderWithProviders(<CueList actorRef={actor} cues={[]} />);
    expect(
      screen.getByText("No described moments in this lecture."),
    ).toBeTruthy();
  });

  it("lists every cue as a button and marks the active one with aria-current", () => {
    const cues = [makeCue("a", 10), makeCue("b", 20)];
    const { actor } = createTestActor(cues);
    actor.send({ type: "JUMP_TO_CUE", cueId: "b" });

    renderWithProviders(<CueList actorRef={actor} cues={cues} />);

    const buttonA = screen.getByRole("button", { name: /phrase a/ });
    const buttonB = screen.getByRole("button", { name: /phrase b/ });
    expect(buttonA.getAttribute("aria-current")).toBeNull();
    expect(buttonB.getAttribute("aria-current")).toBe("true");
  });

  it("clicking a cue dispatches JUMP_TO_CUE, not a raw SEEK", async () => {
    const user = userEvent.setup();
    const cues = [makeCue("a", 10), makeCue("b", 20)];
    const { actor, video } = createTestActor(cues);

    renderWithProviders(<CueList actorRef={actor} cues={cues} />);

    await user.click(screen.getByRole("button", { name: /phrase b/ }));
    expect(video.seekTo).toHaveBeenCalledWith(18);
    expect(actor.getSnapshot().context.activeCue?.cueId).toBe("b");
  });
});
