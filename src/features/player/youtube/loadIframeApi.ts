declare global {
  interface Window {
    YT?: typeof YT;
    onYouTubeIframeAPIReady?: () => void;
  }
}

let loadPromise: Promise<typeof YT> | null = null;

/** Loads the YouTube IFrame Player API script exactly once per page. */
export function loadIframeApi(): Promise<typeof YT> {
  if (loadPromise) {
    return loadPromise;
  }

  if (typeof window !== "undefined" && window.YT?.Player) {
    loadPromise = Promise.resolve(window.YT);
    return loadPromise;
  }

  loadPromise = new Promise((resolve) => {
    const previousReady = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      previousReady?.();
      resolve(window.YT as typeof YT);
    };

    const script = document.createElement("script");
    script.src = "https://www.youtube.com/iframe_api";
    document.head.appendChild(script);
  });

  return loadPromise;
}
