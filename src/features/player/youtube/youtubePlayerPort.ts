import type { VideoPlayerPort } from "../machine/narratedPlayerMachine";
import { loadIframeApi } from "./loadIframeApi";

type VideoState = "playing" | "paused" | "ended" | "buffering";

/**
 * Real `VideoPlayerPort` backed by the YouTube IFrame Player API.
 * `onStateChange` listeners are queued and attached once the underlying
 * player's own `onReady` fires, since the machine's root-level invoke
 * subscribes immediately on actor creation, before the player exists.
 *
 * `onError` is a plain constructor callback, not part of `VideoPlayerPort` —
 * per the F4 plan's decision 5, YouTube's numeric error code bypasses the
 * port entirely and is wired straight to `actorRef.send({ type:
 * "PLAYER_ERROR", code })` from this component layer.
 */
export function createYouTubePlayerPort(
  container: HTMLElement,
  videoId: string,
  options?: { title?: string; onError?: (code: number) => void },
): { port: VideoPlayerPort; ready: Promise<void>; destroy: () => void } {
  const stateListeners = new Set<(state: VideoState) => void>();
  let player: YT.Player | null = null;

  const toPortState = (ytState: YT.PlayerState): VideoState | null => {
    switch (ytState) {
      case window.YT.PlayerState.PLAYING:
        return "playing";
      case window.YT.PlayerState.PAUSED:
        return "paused";
      case window.YT.PlayerState.ENDED:
        return "ended";
      case window.YT.PlayerState.BUFFERING:
        return "buffering";
      default:
        // -1 (unstarted) and 5 (cued) carry no meaning for this port.
        return null;
    }
  };

  const ready = loadIframeApi().then(
    (YT) =>
      new Promise<void>((resolve) => {
        player = new YT.Player(container, {
          videoId,
          playerVars: {
            controls: 0,
            disablekb: 1,
            cc_load_policy: 1,
            rel: 0,
            playsinline: 1,
          },
          events: {
            onReady: (event) => {
              if (options?.title) {
                event.target.getIframe().title = options.title;
              }
              resolve();
            },
            onStateChange: (event: YT.OnStateChangeEvent) => {
              const state = toPortState(event.data);
              if (state) {
                for (const listener of stateListeners) {
                  listener(state);
                }
              }
            },
            onError: (event: YT.OnErrorEvent) => options?.onError?.(event.data),
          },
        });
      }),
  );

  const port: VideoPlayerPort = {
    play: () => player?.playVideo(),
    pause: () => player?.pauseVideo(),
    seekTo: (seconds) => player?.seekTo(seconds, true),
    getCurrentTime: () => player?.getCurrentTime() ?? 0,
    setVolume: (percent) => player?.setVolume(percent),
    onStateChange: (listener) => {
      stateListeners.add(listener);
      return () => stateListeners.delete(listener);
    },
  };

  return {
    port,
    ready: ready as Promise<void>,
    destroy: () => {
      stateListeners.clear();
      player?.destroy();
      player = null;
    },
  };
}
