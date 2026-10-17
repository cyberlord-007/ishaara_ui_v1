import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useVideoStatus } from "./hooks";
import type { VideoKey } from "./schemas";

const VIDEO_KEY = "dQw4w9WgXcQ_en_v1" as VideoKey;

function renderWithQueryClient(videoKey: VideoKey) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  function Providers({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  }
  return renderHook(() => useVideoStatus(videoKey), { wrapper: Providers });
}

describe("useVideoStatus", () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("polls every 3 seconds while processing and stops once status is ready", async () => {
    const { result } = renderWithQueryClient(VIDEO_KEY);

    await waitFor(() => expect(result.current.data?.status).toBe("processing"));

    // The scripted MSW job advances one pipeline stage per poll; after 5 polls it is ready.
    for (let poll = 0; poll < 5; poll += 1) {
      await vi.advanceTimersByTimeAsync(3000);
    }

    await waitFor(() => expect(result.current.data?.status).toBe("ready"));

    const readyFetchCount = result.current.data?.progress_percent;

    // Advancing further must not trigger another fetch now that status is terminal.
    await vi.advanceTimersByTimeAsync(10_000);

    expect(result.current.data?.status).toBe("ready");
    expect(result.current.data?.progress_percent).toBe(readyFetchCount);
  });
});
