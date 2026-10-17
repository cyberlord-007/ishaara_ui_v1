import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { onAuthStateChanged } from "firebase/auth";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LinkForm } from "@/features/submit/LinkForm";
import { Providers } from "@/providers/Providers";

const push = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, replace: vi.fn(), prefetch: vi.fn() }),
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

describe("LinkForm (journey 3: failure then success)", () => {
  beforeEach(() => {
    push.mockClear();
    vi.mocked(onAuthStateChanged).mockImplementation((_auth, callback) => {
      (callback as (user: { uid: string } | null) => void)({
        uid: "test-user",
      });
      return () => {};
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("shows the mapped error for a private video, then succeeds once the link is fixed", async () => {
    const user = userEvent.setup();
    render(
      <Providers>
        <LinkForm />
      </Providers>,
    );

    const linkField = screen.getByLabelText(/YouTube link/i);
    const submitButton = screen.getByRole("button", {
      name: /Describe this video/i,
    });

    await user.type(linkField, "https://youtu.be/vNotPublic1");
    await user.click(submitButton);

    // Two role="alert" elements exist: the inline form error and the assertive
    // live region (which only ever holds the message, not the next step).
    const alerts = await screen.findAllByRole("alert");
    const inlineError = alerts.find((alert) =>
      alert.textContent?.includes("Choose a public video"),
    );
    expect(inlineError?.textContent).toContain(
      "This video is private or unlisted, so it can't be described.",
    );
    expect(push).not.toHaveBeenCalled();

    await user.clear(linkField);
    await user.type(linkField, "https://youtu.be/dQw4w9WgXcQ");
    await user.click(submitButton);

    await vi.waitFor(() => {
      expect(push).toHaveBeenCalledWith("/processing?v=dQw4w9WgXcQ_en_v1");
    });
  });

  it.each([
    ["a non-YouTube URL", "https://vimeo.com/123456789"],
    // The field is type="text" with noValidate on the form specifically so this
    // case (not URL-shaped at all) reaches our Zod validation instead of being
    // silently swallowed by the browser's own native constraint validation.
    ["plain text with no URL shape", "my favourite lecture"],
  ])("toasts and focuses the field for %s", async (_case, input) => {
    const user = userEvent.setup();
    render(
      <Providers>
        <LinkForm />
      </Providers>,
    );

    const linkField = screen.getByLabelText(/YouTube link/i);
    const submitButton = screen.getByRole("button", {
      name: /Describe this video/i,
    });

    await user.type(linkField, input);
    await user.click(submitButton);

    // The message appears twice: the inline FieldError and the toast.
    await vi.waitFor(() => {
      expect(
        screen.getAllByText("That doesn't look like a YouTube link."),
      ).toHaveLength(2);
    });
    expect(screen.getByRole("alertdialog")).toBeTruthy();
    await vi.waitFor(() => {
      expect(document.activeElement).toBe(linkField);
    });
    expect(push).not.toHaveBeenCalled();
  });
});
