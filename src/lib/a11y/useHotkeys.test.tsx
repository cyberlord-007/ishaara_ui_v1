import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { usePreferencesStore } from "@/stores/preferencesStore";
import { useHotkeys } from "./useHotkeys";

function HotkeyHarness({ onSpace }: { onSpace: () => void }) {
  useHotkeys({ space: onSpace });
  return (
    <div>
      <button type="button">Just a button</button>
      <input aria-label="a text field" />
    </div>
  );
}

describe("useHotkeys", () => {
  afterEach(() => {
    usePreferencesStore.setState({ singleKeyShortcuts: true });
  });

  it("fires the handler for the spacebar when focus is outside a text field", async () => {
    const user = userEvent.setup();
    const onSpace = vi.fn();
    render(<HotkeyHarness onSpace={onSpace} />);

    await user.click(screen.getByRole("button", { name: "Just a button" }));
    await user.keyboard(" ");

    expect(onSpace).toHaveBeenCalledTimes(1);
  });

  it("does not fire while focus is in a text field", async () => {
    const user = userEvent.setup();
    const onSpace = vi.fn();
    render(<HotkeyHarness onSpace={onSpace} />);

    await user.click(screen.getByLabelText("a text field"));
    await user.keyboard(" ");

    expect(onSpace).not.toHaveBeenCalled();
  });

  it("does not fire when the user has turned shortcuts off", async () => {
    usePreferencesStore.setState({ singleKeyShortcuts: false });
    const user = userEvent.setup();
    const onSpace = vi.fn();
    render(<HotkeyHarness onSpace={onSpace} />);

    await user.click(screen.getByRole("button", { name: "Just a button" }));
    await user.keyboard(" ");

    expect(onSpace).not.toHaveBeenCalled();
  });
});
