import { render, screen } from "@testing-library/react";
import { onAuthStateChanged } from "firebase/auth";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { axe } from "vitest-axe";
import Home from "@/app/page";
import SignInPage from "@/app/sign-in/page";
import WatchPage from "@/app/watch/page";
import { Providers } from "@/providers/Providers";

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

function mockSignedIn(user: { uid: string } | null) {
  vi.mocked(onAuthStateChanged).mockImplementation((_auth, callback) => {
    (callback as (user: { uid: string } | null) => void)(user);
    return () => {};
  });
}

// jsdom has no real layout/paint engine, so axe-core's canvas-based colour-contrast
// check can't run here; src/styles/tokens.test.ts verifies contrast mathematically instead.
const AXE_OPTIONS = { rules: { "color-contrast": { enabled: false } } };

describe("accessibility smoke", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "matchMedia",
      vi.fn().mockReturnValue({
        matches: false,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      }),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("Sign in page has no axe violations and a focused, tabIndex=-1 h1", async () => {
    mockSignedIn(null);
    const { container } = render(
      <Providers>
        <SignInPage />
      </Providers>,
    );

    const heading = await screen.findByRole("heading", { level: 1 });
    expect(heading.getAttribute("tabindex")).toBe("-1");

    expect(await axe(container, AXE_OPTIONS)).toHaveNoViolations();
  });

  it("Home page (signed in) has no axe violations", async () => {
    mockSignedIn({ uid: "test-user" });
    const { container } = render(
      <Providers>
        <Home />
      </Providers>,
    );

    await screen.findByRole("heading", { level: 1 });
    expect(await axe(container, AXE_OPTIONS)).toHaveNoViolations();
  });

  // The loaded-player state needs a real browser (the YouTube IFrame API has
  // no jsdom equivalent) — this exercises Watch's no-`?v=` error path, the
  // one Watch state renderable without it.
  it("Watch page's invalid-link error state has no axe violations", async () => {
    mockSignedIn({ uid: "test-user" });
    const { container } = render(
      <Providers>
        <WatchPage />
      </Providers>,
    );

    await screen.findByRole("heading", { level: 1 });
    expect(await axe(container, AXE_OPTIONS)).toHaveNoViolations();
  });
});
