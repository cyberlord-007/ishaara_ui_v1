import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { onAuthStateChanged } from "firebase/auth";
import type { ReactElement } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createActor } from "xstate";
import { createNarratedPlayerMachine } from "@/features/player/machine/narratedPlayerMachine";
import { VideoKey } from "@/lib/api/schemas";
import { Providers } from "@/providers/Providers";
import { AskPanel } from "./AskPanel";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn(), push: vi.fn(), prefetch: vi.fn() }),
  usePathname: () => "/",
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock("firebase/auth", () => ({
  onAuthStateChanged: vi.fn(),
  signOut: vi.fn(),
  GoogleAuthProvider: vi.fn(),
  signInWithPopup: vi.fn(),
  isSignInWithEmailLink: () => false,
  sendSignInLinkToEmail: vi.fn(),
  signInWithEmailLink: vi.fn(),
}));

vi.mock("@/lib/firebase", () => ({ auth: {} }));

const videoKey = VideoKey.parse("dQw4w9WgXcQ_en_v1");

function createTestActor() {
  const video = {
    play: vi.fn(),
    pause: vi.fn(),
    seekTo: vi.fn(),
    getCurrentTime: vi.fn(() => 42),
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
      cues: [],
      settings: {
        narrationOutput: "audio",
        narrationRate: 1,
        autoPauseForCues: true,
        playEarcons: false,
      },
      initialSeekSeconds: null,
    },
  });
  actor.start();
  actor.send({ type: "PLAYER_READY" });
  actor.send({ type: "PLAY" });
  return actor;
}

function renderWithProviders(node: ReactElement) {
  return render(<Providers>{node}</Providers>);
}

describe("AskPanel", () => {
  beforeEach(() => {
    vi.mocked(onAuthStateChanged).mockImplementation((_auth, callback) => {
      (callback as (user: { uid: string } | null) => void)({
        uid: "test-user",
      });
      return () => {};
    });
  });

  it("focusing the question field dispatches ASK and pauses the video", async () => {
    const user = userEvent.setup();
    const actor = createTestActor();
    renderWithProviders(<AskPanel videoKey={videoKey} actorRef={actor} />);

    await user.click(screen.getByLabelText("Ask about this moment"));
    expect(actor.getSnapshot().value).toEqual({ asking: "waiting" });
  });

  it("submits the question with the current time and shows the answer", async () => {
    const user = userEvent.setup();
    const actor = createTestActor();
    renderWithProviders(<AskPanel videoKey={videoKey} actorRef={actor} />);

    await user.click(screen.getByLabelText("Ask about this moment"));
    await user.type(
      screen.getByLabelText("Ask about this moment"),
      "What is on the board?",
    );
    await user.click(
      screen.getByRole("button", { name: "Ask about this moment" }),
    );

    expect(
      await screen.findByText(
        "The board showed the ideal gas law, P V equals n R T.",
      ),
    ).toBeTruthy();
    expect(actor.getSnapshot().value).toEqual({ asking: "answering" });
  });

  it("a referenced-moment link exits asking and seeks there", async () => {
    const user = userEvent.setup();
    const actor = createTestActor();
    renderWithProviders(<AskPanel videoKey={videoKey} actorRef={actor} />);

    await user.click(screen.getByLabelText("Ask about this moment"));
    await user.type(
      screen.getByLabelText("Ask about this moment"),
      "What is on the board?",
    );
    await user.click(
      screen.getByRole("button", { name: "Ask about this moment" }),
    );
    await screen.findByText(
      "The board showed the ideal gas law, P V equals n R T.",
    );

    await user.click(screen.getByRole("button", { name: "Jump to 2:08" }));
    expect(actor.getSnapshot().context.currentSeconds).toBe(128);
    expect(actor.getSnapshot().value).toBe("paused");
  });

  it("Done exits the answer and returns focus to the submit button", async () => {
    const user = userEvent.setup();
    const actor = createTestActor();
    renderWithProviders(<AskPanel videoKey={videoKey} actorRef={actor} />);

    await user.click(screen.getByLabelText("Ask about this moment"));
    await user.type(
      screen.getByLabelText("Ask about this moment"),
      "What is on the board?",
    );
    await user.click(
      screen.getByRole("button", { name: "Ask about this moment" }),
    );
    await screen.findByText(
      "The board showed the ideal gas law, P V equals n R T.",
    );

    await user.click(screen.getByRole("button", { name: "Done" }));
    const submitButton = await screen.findByRole("button", {
      name: "Ask about this moment",
    });
    expect(document.activeElement).toBe(submitButton);
  });

  it("announces the remaining character count only at 50 and 0, not on every keystroke", async () => {
    const user = userEvent.setup();
    const actor = createTestActor();
    renderWithProviders(<AskPanel videoKey={videoKey} actorRef={actor} />);

    const field = screen.getByLabelText("Ask about this moment");
    await user.click(field);
    await user.paste("x".repeat(450)); // remaining: 50
    await screen.findByText("50 characters remaining");

    await user.paste("x".repeat(49)); // remaining: 1 — no new announcement
    await user.type(field, "x"); // remaining: 0
    await screen.findByText("0 characters remaining");
  });
});
