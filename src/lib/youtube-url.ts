const VIDEO_ID_PATTERN = /^[A-Za-z0-9_-]{11}$/;

function toUrl(rawInput: string): URL | null {
  const candidate = /^https?:\/\//i.test(rawInput)
    ? rawInput
    : `https://${rawInput}`;
  try {
    return new URL(candidate);
  } catch {
    return null;
  }
}

function extractVideoId(url: URL): string | null {
  const host = url.hostname.toLowerCase().replace(/^(www|m)\./, "");

  if (host === "youtu.be") {
    return url.pathname.split("/")[1] ?? null;
  }

  if (host === "youtube.com") {
    if (url.pathname === "/watch") {
      return url.searchParams.get("v");
    }
    const embedMatch = /^\/embed\/([^/]+)/.exec(url.pathname);
    if (embedMatch) {
      return embedMatch[1] ?? null;
    }
    const shortsMatch = /^\/shorts\/([^/]+)/.exec(url.pathname);
    if (shortsMatch) {
      return shortsMatch[1] ?? null;
    }
  }

  return null;
}

/**
 * Extracts an 11-character YouTube video ID from any of the URL forms the
 * backend accepts (youtube.com/watch, youtu.be, /embed/, /shorts/, with or
 * without a scheme or `www.`/`m.` subdomain).
 * @param rawInput the pasted link, untrimmed
 * @returns the video ID, or `null` if `rawInput` is not a recognisable YouTube link
 */
export function parseYouTubeVideoId(rawInput: string): string | null {
  const url = toUrl(rawInput.trim());
  if (!url) {
    return null;
  }
  const videoId = extractVideoId(url);
  return videoId && VIDEO_ID_PATTERN.test(videoId) ? videoId : null;
}

/**
 * @param rawInput the pasted link, untrimmed
 * @returns whether `rawInput` resolves to a valid YouTube video ID
 */
export function isParsableYouTubeUrl(rawInput: string): boolean {
  return parseYouTubeVideoId(rawInput) !== null;
}
