import type { NarrationAudioPort } from "../machine/narratedPlayerMachine";

/**
 * Real `NarrationAudioPort`. Reuses one `HTMLAudioElement` across cues rather
 * than creating a new one per cue. `play()` settles on `ended`, rejects on
 * `error` or if `.play()` itself rejects (e.g. an autoplay block) — listeners
 * are removed after settling either way so a stale cue can't resolve late.
 */
export function createNarrationAudioPort(): NarrationAudioPort {
  const audio = new Audio();

  return {
    play(url, rate) {
      return new Promise<void>((resolve, reject) => {
        const onEnded = () => {
          cleanup();
          resolve();
        };
        const onError = () => {
          cleanup();
          reject(new Error(`Narration audio failed to play: ${url}`));
        };
        const cleanup = () => {
          audio.removeEventListener("ended", onEnded);
          audio.removeEventListener("error", onError);
        };

        audio.addEventListener("ended", onEnded);
        audio.addEventListener("error", onError);

        audio.src = url;
        audio.playbackRate = rate;
        audio.play().catch((error: unknown) => {
          cleanup();
          reject(error instanceof Error ? error : new Error(String(error)));
        });
      });
    },
    stop() {
      audio.pause();
    },
  };
}
