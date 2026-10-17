import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactElement } from "react";
import { describe, expect, it, vi } from "vitest";
import { createActor } from "xstate";
import type { NarrationCue } from "@/lib/api/schemas";
import { AnnouncerProvider } from "@/providers/AnnouncerProvider";
import { IntlProvider } from "@/providers/IntlProvider";
import {
  createNarratedPlayerMachine,
  type NarratedPlayerSettings,
} from "../machine/narratedPlayerMachine";
import { NowDescribing } from "./NowDescribing";

function renderWithProviders(node: ReactElement) {
  return render(
    <IntlProvider>
      <AnnouncerProvider>{node}</AnnouncerProvider>
    </IntlProvider>,
  );
}

function makeCue(
  cueId: string,
  startSeconds: number,
  audioUrl: string | null = `${cueId}.mp3`,
): NarrationCue {
  return {
    cueId,
    startSeconds,
    spokenPhrase: "this",
    referentKind: "diagram",
    boardDescription: "",
    gapSummary: "",
    narrationText: `narrating ${cueId}`,
    audioUrl,
    audioDurationSeconds: audioUrl ? 2 : null,
    confidence: 1,
  };
}

function createTestActor(
  cues: NarrationCue[],
  settings: Partial<NarratedPlayerSettings> = {},
) {
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
    input: {
      cues,
      settings: {
        narrationOutput: "audio",
        narrationRate: 1,
        autoPauseForCues: true,
        playEarcons: false,
        ...settings,
      },
      initialSeekSeconds: null,
    },
  });
  actor.start();
  actor.send({ type: "PLAYER_READY" });
  return { actor, video };
}

describe("NowDescribing", () => {
  it("shows nothing-active copy when there is no active cue", () => {
    const { actor } = createTestActor([]);
    renderWithProviders(<NowDescribing actorRef={actor} />);
    expect(
      screen.getByText("No description is active right now."),
    ).toBeTruthy();
  });

  it("shows the active cue's text and kind while speaking, with Repeat and Skip", () => {
    const { actor } = createTestActor([makeCue("a", 10)]);
    actor.send({ type: "NEXT_CUE" });

    renderWithProviders(<NowDescribing actorRef={actor} />);

    expect(screen.getByText("narrating a")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Repeat" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Skip" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Resume" })).toBeNull();
  });

  it("shows a Resume button and the waiting hint in awaitingResume", () => {
    const { actor } = createTestActor([makeCue("a", 10, null)]);
    actor.send({ type: "NEXT_CUE" });

    renderWithProviders(<NowDescribing actorRef={actor} />);

    expect(screen.getByText("Waiting for you to resume.")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Resume" })).toBeTruthy();
  });

  it("Repeat and Skip dispatch their events to the actor", async () => {
    const user = userEvent.setup();
    const { actor } = createTestActor([makeCue("a", 10)]);
    actor.send({ type: "NEXT_CUE" });

    renderWithProviders(<NowDescribing actorRef={actor} />);

    await user.click(screen.getByRole("button", { name: "Skip" }));
    expect(actor.getSnapshot().value).toBe("paused");
  });
});
