import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { onAuthStateChanged } from "firebase/auth";
import type { ReactElement } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { VideoKey } from "@/lib/api/schemas";
import { Providers } from "@/providers/Providers";
import { NotesView } from "./NotesView";

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

function renderWithProviders(node: ReactElement) {
  return render(<Providers>{node}</Providers>);
}

describe("NotesView", () => {
  beforeEach(() => {
    vi.mocked(onAuthStateChanged).mockImplementation((_auth, callback) => {
      (callback as (user: { uid: string } | null) => void)({
        uid: "test-user",
      });
      return () => {};
    });
  });

  it("sanitizes the HTML and links [Board, mm:ss] markers back to Watch", async () => {
    renderWithProviders(
      <NotesView videoKey={videoKey} title="Introduction to Thermodynamics" />,
    );

    const link = await screen.findByRole("link", { name: "[Board, 00:42]" });
    expect(link.getAttribute("href")).toBe(`/watch?v=${videoKey}&t=42`);
    expect(
      screen.getByRole("heading", {
        level: 1,
        name: "Introduction to Thermodynamics",
      }),
    ).toBeTruthy();
  });

  it("has a working Download and Print button", async () => {
    const user = userEvent.setup();
    const printSpy = vi.spyOn(window, "print").mockImplementation(() => {});
    renderWithProviders(
      <NotesView videoKey={videoKey} title="Introduction to Thermodynamics" />,
    );

    await screen.findByRole("heading", { level: 1 });
    await user.click(screen.getByRole("button", { name: "Download as text" }));
    await user.click(screen.getByRole("button", { name: "Print" }));

    expect(printSpy).toHaveBeenCalled();
    printSpy.mockRestore();
  });
});
