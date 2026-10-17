# Ishaara Frontend: Implementation Plan

Oct 17, 2026 · @Akash

A Next.js 16 (App Router) web app, built with Bun and TypeScript, that lets a blind or low-vision student paste a YouTube lecture link, wait while the backend processes it, then watch it with spoken board descriptions that pause the video at every pointing moment. It ships in 9 milestones (F0 to F8, about 19 hours) and runs against the backend described in *Ishaara Backend: Implementation Plan*.

The product is built screen-reader first. Every screen must be fully usable with NVDA, JAWS, VoiceOver and TalkBack using only a keyboard or switch, before any visual polish is considered. The visual design is quiet and high-contrast; the voice does the work.

Read the whole plan before writing code. Sections below are referenced from milestones by name.

## Rules for the coding agent

Work milestone by milestone, in order. A milestone is done only when every acceptance check in it passes; do not start the next one with failing checks.

**Working rules**

1. Read this whole document and the backend plan's *API contract* section before writing code.
2. The backend's OpenAPI document (`GET /openapi.json`) is the source of truth for wire shapes. If it disagrees with this plan, follow OpenAPI, update `src/lib/api/schemas.ts`, and log the change in `docs/DECISIONS.md`.
3. Never call `fetch` outside `src/lib/api/`. Components and hooks use the typed client only, so tests can swap in MSW handlers.
4. Never touch the YouTube IFrame API outside `src/features/player/youtube/`. The playback machine talks to it through the `VideoPlayerPort` interface.
5. Every interactive element is a real HTML control (`button`, `a`, `input`, `select`). No `div` with `onClick`. No positive `tabindex`.
6. Every user-visible string lives in `src/messages/{en,hi}.json`. No hard-coded copy in components.
7. Secrets and config come from `NEXT_PUBLIC_*` env vars validated at boot by `src/env.ts`. Never commit `.env.local`.
8. Commit after each milestone with message `feat(fN): <summary>`.
9. Keep `AGENTS.md` at the repo root up to date: one line per convention you add, so the next agent session starts with it.

**Coding standards**

- TypeScript `strict: true` plus `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `noImplicitOverride`. No `any`; `unknown` and narrow it.
- Types derive from Zod schemas with `z.infer`; never hand-write a type that duplicates a schema.
- Server Components by default. Add `"use client"` only to the leaf that needs state, effects or browser APIs.
- Names say what things are: `videoKey`, `cueStartSeconds`, `narrationLanguage`. No `data`, `res`, `tmp`, `item` outside a two-line callback.
- Components stay under about 120 lines; hooks under about 60. Pure logic (URL parsing, cue lookup, time formatting) lives in plain functions with unit tests.
- TSDoc on every exported function, hook and component: what it does, params, return, and what it throws.
- Biome for lint and format (one fast tool, works natively with Bun).

**Definition of done for every milestone**

```bash
bun run typecheck   # tsc --noEmit
bun run lint        # biome check .
bun run test        # vitest run
bun run test:a11y   # playwright + axe, zero serious or critical violations
bun run build
```

## Design 
Implement this design in this codebase:
https://claude.ai/code/artifact/a89a8b8b-b07a-4700-ab36-f804b246b0f2

Read the design's files from that link. Match how it looks, using this codebase's own components and conventions.

## Backend integration

The frontend owns four jobs the backend hands it: sign the user in, submit a link and poll every 3 seconds, drive the YouTube player and pause it for each cue, and render notes and spoken answers. Every backend route maps to exactly one hook.

| Backend route | Hook (`src/lib/api/hooks.ts`) | Query key | Notes |
| --- | --- | --- | --- |
| `POST /v1/videos` | `useSubmitVideo()` | mutation | `200` = ready, go straight to the player; `202` = go to the processing screen |
| `GET /v1/videos/{video_key}` | `useVideoStatus(videoKey)` | `['video', videoKey]` | `refetchInterval` 3000 ms while `queued` or `processing`, then stops |
| `GET /v1/videos/{video_key}/cues` | `useCues(videoKey)` | `['video', videoKey, 'cues']` | Enabled only when status is `ready`; `staleTime: Infinity` (results are immutable per `video_key`) |
| `GET /v1/videos/{video_key}/cues.vtt` | none, used as a URL | n/a | Passed to a hidden `<track kind="descriptions">` as the fallback |
| `GET /v1/videos/{video_key}/notes?format=html` | `useNotes(videoKey)` | `['video', videoKey, 'notes']` | Sanitised with DOMPurify before render |
| `POST /v1/videos/{video_key}/questions` | `useAskQuestion(videoKey)` | mutation | Answer is announced, then its audio plays |
| `GET /v1/me/videos` | `useHistory()` | `['me', 'videos']` | Invalidated after a successful submit |

**Mismatches to fix before F1**

- **CORS port.** The backend allows `http://localhost:5173` (Vite's default). Next.js dev runs on 3000. Add `http://localhost:3000` to the backend's `ALLOWED_ORIGINS`; do not change Next's port.
- **Hosting.** The backend allows `https://$PROJECT_ID.web.app` (Firebase Hosting). Build with `output: 'export'` and deploy the static site to Firebase Hosting, so the origin matches with no backend change. Static export forbids runtime dynamic segments, so the player route is `/watch?v={video_key}`, not `/watch/[videoKey]`.
- **Unspecified shapes.** The backend plan names `VideoStatusResponse` and `VideoSummary` but does not list their fields. The schemas in *Types and data models* infer them from `VideoRecord`; confirm against `/openapi.json` in F1.

**Auth flow.** Firebase Auth (Google sign-in plus email link, both screen-reader friendly; no CAPTCHA puzzles). The API client calls `auth.currentUser.getIdToken()` before every request; the SDK caches the token and refreshes it near expiry. On `401 invalid_token` the client forces one refresh with `getIdToken(true)` and retries once, then signs the user out with an announced message.

**Errors.** Every non-2xx response is parsed as RFC 9457 problem details into an `ApiError` carrying `code`. The UI never shows `title` or `detail` raw; it maps `code` to a translated message with a next step (see *Screens and flows*).

## Tech stack

The key choice: state is split by kind. Server data lives in TanStack Query, the pause-narrate-resume player lives in an XState machine, and a small set of persisted preferences lives in Zustand. Each tool does one job it is best at; none of them overlap.

| Concern | Choice | Why |
| --- | --- | --- |
| Runtime, packages | Bun 1.x (`bun.lock` committed) | Fast installs and scripts; `bun --bun next` runs Next on Bun |
| Framework | Next.js 16, App Router, `output: 'export'` | Static export matches the backend's Firebase Hosting CORS origin; Server Components still render the shell at build |
| Language | TypeScript 5.x, strict plus extra flags | See *Rules for the coding agent* |
| Runtime validation | Zod 4 | One schema gives the TS type and validates every API response at the boundary |
| Server state | TanStack Query v5 | Polling with `refetchInterval`, caching by `video_key`, retries, devtools |
| Playback state | XState v5 + `@xstate/react` | The cue player is a true state machine with timers and async audio; a machine makes illegal states impossible and is testable without a browser |
| Client preferences | Zustand 5 with `persist` | Tiny global store for language, speech rate, auto-pause, text size, theme; survives reloads |
| Auth | Firebase JS SDK, modular, latest major (`firebase/auth`) | Backend verifies Firebase ID tokens |
| Styling | Tailwind CSS v4 with CSS variables as design tokens | Tokens in one file; utilities keep components small; `@media (prefers-*)` support built in |
| Accessible primitives | React Aria Components (Adobe) | Best-in-class keyboard, focus and screen-reader behaviour for dialogs, menus, sliders, toasts; unstyled |
| Video | YouTube IFrame Player API, loaded once via `next/script` | Required by the backend contract |
| Narration audio | One reused `HTMLAudioElement` | Plays cross-origin WAVs from the public bucket without CORS setup; `playbackRate` gives speech speed |
| Notes | DOMPurify | Backend HTML is sanitised before insertion |
| i18n | `next-intl` with `en` and `hi` messages | Matches the backend's `narration_language`; sets `lang` on `<html>` |
| Forms | React Hook Form + `@hookform/resolvers/zod` | Same Zod schema validates the URL field; accessible error wiring |
| Lint, format | Biome | One fast tool; includes a11y lint rules |
| Unit tests | Vitest + Testing Library + `vitest-axe` | Fast, works under Bun |
| API mocking | MSW 2 | Same handlers in tests, Storybook-free dev, and Playwright |
| E2E and a11y | Playwright + `@axe-core/playwright` | Keyboard-only journeys and axe scans on every screen |
| Deploy | Firebase Hosting | Same project and domain the backend already trusts |

Why not Redux Toolkit or Jotai: almost all shared state is server state (TanStack Query) or the player (XState). What remains is five preferences, which is exactly Zustand's size.

## Repository layout

Feature folders own their UI, hooks and logic; `lib/` holds things every feature uses. The two hardest pieces, the API client and the player machine, each sit behind one interface so tests replace them.

```text
ishaara-web/
├── AGENTS.md                  # conventions for coding agents, one line each
├── bun.lock
├── biome.json
├── next.config.ts             # output: 'export', images.unoptimized, typedRoutes
├── tsconfig.json
├── playwright.config.ts
├── vitest.config.ts
├── .env.example
├── docs/DECISIONS.md
├── public/
│   └── earcons/               # short cue-start / cue-end tones (WAV, < 200 ms)
├── src/
│   ├── env.ts                 # Zod-validated NEXT_PUBLIC_* config
│   ├── app/
│   │   ├── layout.tsx         # <html lang>, skip link, providers, live region host
│   │   ├── page.tsx           # Home: paste a link
│   │   ├── sign-in/page.tsx
│   │   ├── processing/page.tsx  # ?v={video_key}
│   │   ├── watch/page.tsx       # ?v={video_key}
│   │   ├── notes/page.tsx       # ?v={video_key}
│   │   ├── library/page.tsx     # history
│   │   ├── settings/page.tsx
│   │   └── not-found.tsx
│   ├── providers/
│   │   ├── query-provider.tsx
│   │   ├── auth-provider.tsx  # onAuthStateChanged → context
│   │   └── announcer-provider.tsx  # polite + assertive live regions
│   ├── lib/
│   │   ├── api/
│   │   │   ├── client.ts      # apiRequest<T>(): token, problem+json, Zod parse
│   │   │   ├── schemas.ts     # Zod schemas = wire types
│   │   │   ├── errors.ts      # ApiError, ErrorCode union, toUserMessage()
│   │   │   ├── endpoints.ts   # one function per route
│   │   │   └── hooks.ts       # TanStack Query hooks
│   │   ├── firebase.ts
│   │   ├── youtube-url.ts     # parseYouTubeVideoId() — pure, mirrors backend
│   │   ├── time.ts            # formatClock(), formatSpokenDuration() — pure
│   │   └── a11y/
│   │       ├── use-announce.ts
│   │       ├── use-focus-on-mount.ts
│   │       └── use-hotkeys.ts
│   ├── stores/
│   │   └── preferences-store.ts   # Zustand + persist
│   ├── features/
│   │   ├── submit/            # LinkForm, LanguagePicker
│   │   ├── processing/        # StageList, ProgressAnnouncer
│   │   ├── player/
│   │   │   ├── machine/
│   │   │   │   ├── narrated-player.machine.ts
│   │   │   │   ├── cue-index.ts      # findNextCue(), cuesBetween() — pure
│   │   │   │   └── narrated-player.machine.test.ts
│   │   │   ├── youtube/
│   │   │   │   ├── youtube-player-port.ts  # VideoPlayerPort impl
│   │   │   │   └── load-iframe-api.ts
│   │   │   ├── audio/narration-audio.ts    # NarrationAudioPort impl
│   │   │   └── components/   # PlayerShell, ControlBar, CueList, NowNarrating
│   │   ├── questions/         # AskPanel, AnswerCard
│   │   ├── notes/             # NotesView
│   │   └── library/           # HistoryList
│   ├── components/ui/         # Button, TextField, Select, Slider, Dialog, Toast
│   ├── messages/{en,hi}.json
│   └── styles/
│       ├── tokens.css         # design tokens, light + dark + high contrast
│       └── globals.css
├── tests/
│   ├── msw/handlers.ts        # every backend route, plus error fixtures
│   ├── fixtures/              # VideoRecord-shaped JSON, sample cues
│   └── e2e/                   # keyboard journeys + axe per screen
└── firebase.json              # hosting: out/, cleanUrls, headers
```

## Types and data models

Every wire type is a Zod schema in `src/lib/api/schemas.ts`, and its TypeScript type is `z.infer` of that schema. The API client parses every response with its schema, so a backend change fails loudly at the boundary instead of deep in a component. Field names stay `snake_case` on the wire and are mapped to `camelCase` once, inside the schema with `.transform()`.

**Enums** (mirror `models/domain.py` exactly)

```ts
export const VideoStatus = z.enum(["queued", "processing", "ready", "failed"]);
export const PipelineStage = z.enum(["resolving", "analyzing", "writing", "voicing", "saving"]);
export const NarrationLanguage = z.enum(["en", "hi"]);
export const ReferentKind = z.enum([
  "equation", "diagram", "graph", "code", "table", "text", "physical_object",
]);

export type VideoStatus = z.infer<typeof VideoStatus>;
export type PipelineStage = z.infer<typeof PipelineStage>;
export type NarrationLanguage = z.infer<typeof NarrationLanguage>;
export type ReferentKind = z.infer<typeof ReferentKind>;

/** Branded so a raw string can never be passed where a video key is expected. */
export const VideoKey = z.string().regex(/^[A-Za-z0-9_-]{11}_(en|hi)_v\d+$/).brand<"VideoKey">();
export type VideoKey = z.infer<typeof VideoKey>;
```

**Responses**

```ts
export const NarrationCueSchema = z
  .object({
    cue_id: z.string(),
    start_seconds: z.number().nonnegative(),
    spoken_phrase: z.string(),
    referent_kind: ReferentKind,
    board_description: z.string(),
    narration_text: z.string(),
    audio_url: z.string().url().nullable(),
    audio_duration_seconds: z.number().positive().nullable(),
    confidence: z.number().min(0).max(1),
  })
  .transform((cue) => ({
    cueId: cue.cue_id,
    startSeconds: cue.start_seconds,
    spokenPhrase: cue.spoken_phrase,
    referentKind: cue.referent_kind,
    boardDescription: cue.board_description,
    narrationText: cue.narration_text,
    audioUrl: cue.audio_url,
    audioDurationSeconds: cue.audio_duration_seconds,
    confidence: cue.confidence,
  }));
export type NarrationCue = z.output<typeof NarrationCueSchema>;

// Inferred from VideoRecord; confirm against /openapi.json in F1.
export const VideoStatusResponseSchema = z.object({
  video_key: VideoKey,
  youtube_video_id: z.string().length(11),
  narration_language: NarrationLanguage,
  title: z.string(),
  channel_title: z.string(),
  duration_seconds: z.number().int().nonnegative(),
  status: VideoStatus,
  stage: PipelineStage.nullable(),
  progress_percent: z.number().int().min(0).max(100),
  error_code: z.string().nullable(),
  error_message: z.string().nullable(),
});

export const CuesResponseSchema = z.object({ cues: z.array(NarrationCueSchema) });

export const QuestionAnswerSchema = z.object({
  answer_text: z.string(),
  answer_audio_url: z.string().url().nullable(),
  referenced_seconds: z.array(z.number().nonnegative()),
});

export const VideoSummarySchema = VideoStatusResponseSchema.pick({
  video_key: true, title: true, channel_title: true,
  duration_seconds: true, narration_language: true, status: true,
}).extend({ submitted_at: z.iso.datetime() });

export const HistoryResponseSchema = z.object({ videos: z.array(VideoSummarySchema) });
```

**Requests**

```ts
export const SubmitVideoRequest = z.object({
  youtube_url: z.string().trim().min(1).refine(isParsableYouTubeUrl, "invalid_youtube_url"),
  narration_language: NarrationLanguage,
});

export const AskQuestionRequest = z.object({
  question: z.string().trim().min(3).max(500),   // backend max_length is 500
  at_seconds: z.number().nonnegative().nullable(),
});
```

**Errors** (`src/lib/api/errors.ts`)

```ts
export const ErrorCode = z.enum([
  "invalid_token", "invalid_youtube_url", "video_not_public", "video_not_embeddable",
  "video_is_live", "video_too_long", "daily_limit_reached", "video_not_found",
  "video_not_ready",
]);

export const ProblemDetailsSchema = z.object({
  type: z.string(),
  title: z.string(),
  status: z.number().int(),
  detail: z.string().optional(),
  code: z.string(),   // kept open: unknown codes map to a generic message
});

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: ErrorCode | "network_error" | "unknown_error",
    readonly detail: string | undefined,
  ) { super(code); }
}
```

**Client-side models** (never sent to the backend)

```ts
/** Persisted in localStorage by Zustand. */
export interface Preferences {
  narrationLanguage: NarrationLanguage;   // default for new submissions
  interfaceLanguage: "en" | "hi";
  narrationRate: 0.75 | 1 | 1.25 | 1.5;   // HTMLAudioElement.playbackRate
  autoPauseForCues: boolean;              // false = cues play over the video, ducked
  playEarcons: boolean;                   // short tone before and after each cue
  narrationOutput: "audio" | "screen_reader"; // who reads board descriptions
  textScale: 1 | 1.25 | 1.5;
  theme: "system" | "light" | "dark" | "high-contrast";
  reducedMotion: "system" | "reduce";
}

/** Ports the player machine depends on, so tests use fakes. */
export interface VideoPlayerPort {
  play(): void;
  pause(): void;
  seekTo(seconds: number): void;
  getCurrentTime(): number;
  setVolume(percent: number): void;
  onStateChange(listener: (state: "playing" | "paused" | "ended" | "buffering") => void): () => void;
}

export interface NarrationAudioPort {
  play(url: string, rate: number): Promise<void>;   // resolves on `ended`
  stop(): void;
}
```

## State management

Each piece of state has exactly one owner. If a value can be derived from another, derive it; do not store it twice.

| State | Owner | Lifetime | Example |
| --- | --- | --- | --- |
| Backend data | TanStack Query | Cache, keyed by `video_key` | status, cues, notes, history |
| Auth session | `AuthProvider` (React context over `onAuthStateChanged`) | Firebase persistence | current user, `isLoading` |
| Playback | XState `narratedPlayerMachine`, one actor per watch page | Mount to unmount | `playing`, `narrating`, current cue, skipped cues |
| Preferences | Zustand `usePreferencesStore` with `persist` | `localStorage` | language, narration rate, theme |
| Form input | React Hook Form | Component | the link field |
| Route state | URL search params | Shareable | `?v={video_key}`, `?t=754` to start at a time |
| Announcements | `AnnouncerProvider` (context + two live regions) | Page | "Analysing the video, 40 percent" |

**TanStack Query defaults** (`providers/query-provider.tsx`)

- `retry`: up to 2 times only for `network_error` and 5xx; never for 4xx.
- `refetchOnWindowFocus: false` on the watch page, so a focus change never re-renders the player mid-cue.
- `useVideoStatus` sets `refetchInterval: (query) => isTerminal(query.state.data?.status) ? false : 3000` and `refetchIntervalInBackground: true`, so processing keeps polling when the user switches tabs to do something else.
- Cues, notes and VTT are immutable for a `video_key`: `staleTime: Infinity`, `gcTime: 30 minutes`.

**Zustand store shape**

```ts
interface PreferencesStore extends Preferences {
  setPreference: <K extends keyof Preferences>(key: K, value: Preferences[K]) => void;
  reset: () => void;
}

export const usePreferencesStore = create<PreferencesStore>()(
  persist(
    (set) => ({ ...defaultPreferences, setPreference: (key, value) => set({ [key]: value }), reset: () => set(defaultPreferences) }),
    { name: "ishaara-preferences", version: 1, migrate: migratePreferences },
  ),
);
```

Components read single fields with selectors (`usePreferencesStore((s) => s.narrationRate)`) so a change to the theme never re-renders the player. Because the site is a static export, the store hydrates on the client; components that read it render a stable default on the first paint to avoid a hydration mismatch.

**Why XState for the player.** The player must coordinate three clocks: the YouTube video, the narration audio and the user. It has rules like "never start a cue while one is playing", "a seek past several cues skips them, it does not queue them", and "if the user presses play during narration, stop the narration". A machine encodes these as transitions; a reducer or loose `useState` flags let impossible states (video playing and narration playing at once) slip in. The machine is specified in *Narrated player engine*.

## Accessibility requirements

The target is WCAG 2.2 Level AA everywhere, plus four AAA criteria chosen because the primary users are blind or low-vision: 1.4.6 Contrast (Enhanced, 7:1 for text), 2.5.5 Target Size (44 by 44 px), 2.4.13 Focus Appearance, and 2.2.3 No Timing. Accessibility checks are part of every milestone's definition of done, not a final milestone.

**Page structure (every screen)**

- First focusable element is a "Skip to main content" link, visible on focus.
- Landmarks: one `header` with `nav`, one `main`, one `footer`. The watch page adds `section` regions with `aria-labelledby`: Video, Narration, Ask a question.
- Exactly one `h1` per page; headings never skip a level. Backend notes use `###`; `NotesView` renders them inside an `h2` per 5-minute section so the outline stays valid.
- On every client-side route change, focus moves to the page `h1` (with `tabIndex={-1}`) and `document.title` updates to `<Page> · Ishaara`. Next's route announcer is kept on as a backup.
- `lang` on `<html>` follows the interface language. Any Hindi string inside English UI (titles, narration text) is wrapped in `<span lang="hi">`, so screen readers switch voice.

**Announcements**

One `AnnouncerProvider` renders two visually hidden live regions at the root: `role="status"` (polite) and `role="alert"` (assertive). Components call `announce(message, "polite" | "assertive")`; nothing else creates live regions. Rules:

- Processing progress is announced on each stage change and at most every 20 percent, never every poll. Example: "Writing narration. 75 percent."
- Errors are assertive. Everything else is polite.
- The same message is never announced twice in 2 seconds (dedupe in the provider).

**Narration and screen readers must not talk over each other.** This is the hardest problem in the product. A setting, *Who reads board descriptions*, chooses one voice:

| Setting value | What happens at a cue | For whom |
| --- | --- | --- |
| `audio` (default) | Video pauses, Ishaara's recorded voice plays, video resumes on `ended` | Most users; consistent Hindi and English voice |
| `screen_reader` | Video pauses, the narration text goes to the assertive live region, video resumes after the user presses Resume (or after an estimated reading time, if they turn that on) | Users who want their own reader's voice and speed, braille display users |

In both modes the current cue's text is always visible on screen in the *Now describing* panel, for low-vision users and deaf-blind users on braille. A cue whose `audio_url` is `null` falls back to `screen_reader` behaviour for that cue only.

**Keyboard**

Every feature works with a keyboard alone; nothing needs a pointer, drag or hover. The watch page adds shortcuts, active only when focus is not in a text field. Single-key shortcuts can be turned off or remapped in Settings (WCAG 2.1.4). `?` opens a dialog listing them.

| Key | Action |
| --- | --- |
| `Space` or `K` | Play or pause (during narration: stop narration and resume video) |
| `R` | Repeat the last description |
| `N` / `P` | Jump to the next / previous described moment |
| `J` / `L` | Back / forward 10 seconds |
| `S` | Skip the current description |
| `Q` | Focus the question box (pauses the video) |
| `T` | Speak the current time and the title |
| `Escape` | Close any dialog and return focus to the control that opened it |

**The YouTube iframe** gets `title="Lecture video: <title>"`, and is created with `controls: 0`, `disablekb: 1`, `cc_load_policy: 1`, `rel: 0`, `playsinline: 1`. Ishaara's own `ControlBar` replaces YouTube's controls, so every control is a labelled native button and shortcuts never conflict. The iframe is `tabIndex={-1}`; keyboard users never land inside it.

**Forms**

- Every input has a visible `<label>`; placeholders are examples, never labels.
- Errors appear on submit, not on every keystroke. The field gets `aria-invalid="true"` and `aria-describedby` pointing to the message; focus moves to the first invalid field.
- Server errors (for example `video_not_embeddable`) render in an inline error block with `role="alert"` under the form and say what to do next.

**Visual**

- Text contrast 7:1, non-text contrast (borders, icons, focus rings) 3:1 in every theme. Checked in CI by a token contrast test.
- Focus ring: 3 px solid, 2 px offset, in a colour that contrasts 3:1 with both the element and the page. Never removed.
- Reflows at 320 CSS px and 400 percent zoom with no horizontal scroll; text spacing overrides (WCAG 1.4.12) do not clip anything.
- Supports `prefers-reduced-motion`, `prefers-contrast: more`, `prefers-color-scheme` and `forced-colors: active` (Windows High Contrast): components use system colours there instead of tokens.
- Never use colour alone: stage states have an icon and a word; errors have an icon and text.

**Time and waiting.** No session or page timeouts. Processing can take minutes; the user can leave the page and come back from Library, and is told so.

**Manual test matrix** (run at F4, F6 and F8)

| Screen reader | Browser | Platform |
| --- | --- | --- |
| NVDA (latest) | Firefox, Chrome | Windows 11 |
| JAWS 2026 | Chrome | Windows 11 |
| VoiceOver | Safari | macOS |
| VoiceOver | Safari | iOS |
| TalkBack | Chrome | Android |

Each run follows the three journeys in *Testing and deployment* and is logged in `docs/a11y-audit.md`.

## Design system

The visual idea is a student's notebook in a bright room: blue-black ink on clean white, and one highlighter yellow that marks the thing being pointed at, exactly what Ishaara ("gesture") does with its voice. Everything else stays quiet so low-vision users find the one highlighted thing fast.

**Colour tokens** (`src/styles/tokens.css`; every text pair meets 7:1)

| Token | Light | Dark ("board") | Use |
| --- | --- | --- | --- |
| `--surface` | `#FFFFFF` | `#0E1A2B` | Page background |
| `--surface-raised` | `#F3F5F9` | `#16253A` | Panels, input fills |
| `--ink` | `#0F1C3F` | `#F1F4F9` | Body text, icons |
| `--ink-muted` | `#3A4766` | `#C3CCDB` | Secondary text (still 7:1) |
| `--pen` | `#1D3BB8` | `#9DB4FF` | Primary buttons, links, focus ring |
| `--highlighter` | `#FFD43B` | `#FFD43B` | Current cue mark, active stage; never behind long text, never as text colour |
| `--danger` | `#9B1C1C` | `#FFA8A8` | Errors (always with an icon and words) |
| `--success` | `#14532D` | `#86E0A8` | Ready state |

A third theme, `high-contrast`, is pure `#000000` on `#FFFFFF` (or reversed) with `--pen` set to the text colour and a 4 px focus ring. Under `forced-colors: active`, components switch to `CanvasText`, `Canvas`, `Highlight` and `ButtonText`.

**Type**

- Latin: **Atkinson Hyperlegible Next**, designed by the Braille Institute for low-vision readers (distinct `l I 1`, `0 O`). Devanagari: **Mukta**, chosen for its open counters and matching x-height. Both self-hosted with `next/font/google`; fallback `system-ui, "Noto Sans Devanagari", sans-serif`.
- Base size 18 px (1.125 rem), line height 1.6 (1.75 for Devanagari), measure 68 characters.
- Scale (ratio 1.25): 14.4 / 18 / 22.5 / 28 / 35 / 44 px. Weights 400 and 700 only. Times use `font-variant-numeric: tabular-nums`.
- Sentence case everywhere; no all-caps labels.

**Space, shape, motion**

- 4 px base grid; steps 4, 8, 12, 16, 24, 32, 48, 64.
- Radius 10 px on controls, 16 px on panels, full on pills. Borders 1 px `--ink` at 20 percent for structure; 2 px `--pen` for the focused or selected item.
- Minimum target 44 by 44 px; primary actions 56 px tall.
- Motion: one moment only. When a cue begins, the highlighter mark sweeps across the *Now describing* heading in 240 ms. Under `prefers-reduced-motion` it appears instantly. No entrance animations, no hover transitions.

**Components** (`src/components/ui/`, all wrapping React Aria Components)

| Component | Built on | Notes |
| --- | --- | --- |
| `Button` | RAC `Button` | Variants `primary`, `secondary`, `quiet`; always a text label, icons are decorative (`aria-hidden`) |
| `TextField` | RAC `TextField` | Label, description, error slot wired by RAC |
| `RadioGroup` | RAC `RadioGroup` | Language choice (2 options = radios, not a select) |
| `Slider` | RAC `Slider` | Narration speed; announces "1.25 times" via `getValueLabel` |
| `Switch` | RAC `Switch` | Settings toggles |
| `Dialog` | RAC `Modal` + `Dialog` | Shortcuts help, sign-out confirm; focus trap and restore |
| `Toast` | RAC `UNSTABLE_Toast` | Non-blocking confirmations; never the only place an error appears |
| `ProgressStages` | native `ol` + `progress` | Processing screen |
| `CueList` | native `ol` of buttons | Each item: time, spoken phrase, kind; button jumps there |

The designs in the *Screens and flows* section use these tokens.

## Screens and flows

Seven screens, one job each. The main journey is three steps: paste a link, wait, listen. A cached video skips the wait.

1. **Sign in** (`/sign-in`). `h1` "Sign in to Ishaara". Two buttons: *Continue with Google*, *Email me a sign-in link*. The email path is one labelled field and one button; the confirmation says "Check your inbox for a link from Ishaara. You can close this page." Unauthenticated users on any other route are sent here with a `?next=` param, and returned after sign-in.
2. **Home** (`/`). `h1` "Describe a lecture". One form: *YouTube link* text field (focused on load only on this page), *Narration language* radio group (English, Hindi; default from preferences), primary button *Describe this video*. Client-side `parseYouTubeVideoId` rejects bad links before any request. On `200` go to Watch; on `202` go to Processing. Below the form, the three most recent videos from Library as links.
3. **Processing** (`/processing?v=`). `h1` is the video title. An ordered list of the five stages, each marked *Done*, *In progress* or *Waiting* with an icon and word, plus one native `progress` element with `aria-valuetext="Writing narration, 75 percent"`. Copy: "This usually takes 2 to 6 minutes. You can leave this page; the video will be in your Library." When status turns `ready`: announce "Ready. Opening the player." and navigate to Watch with focus on its `h1`. When `failed`: show the mapped error and a *Try again* button.
4. **Watch** (`/watch?v=&t=`). The core screen; detailed in *Narrated player engine*. Regions in reading order: title and channel; video; *Now describing* panel (current cue text, kind, time, and *Repeat* and *Skip* buttons); control bar (Play, Back 10 s, Forward 10 s, Previous description, Next description, current time as text, narration speed); *Described moments* list; *Ask a question* panel; link to Notes.
5. **Notes** (`/notes?v=`). Backend HTML notes, sanitised, under the video title. Each `[Board, 12:40]` marker becomes a link back to Watch at that time. Buttons: *Download as text* (Markdown), *Print*. A print stylesheet removes navigation.
6. **Library** (`/library`). `h1` "Your lectures". A list (not a table, so it reads well on mobile screen readers) of up to 20 videos, newest first: title as a link, language, duration in words ("42 minutes"), status. Processing items link to Processing; failed items say why. Empty state: "No lectures yet. Paste a YouTube link on the home page to describe your first one." with a link.
7. **Settings** (`/settings`). Groups with `fieldset` and `legend`: *Narration* (who reads descriptions, speed, pause for descriptions, play tones), *Display* (theme, text size), *Keyboard* (single-key shortcuts on or off), *Language* (interface language). Changes apply immediately and are announced ("Narration speed set to 1.25 times").

**Error messages.** `toUserMessage(code)` returns a title and a next step. Copy never apologises and always says what to do.

| Code | Message shown | Next step offered |
| --- | --- | --- |
| `invalid_youtube_url` | That doesn't look like a YouTube link. | Paste a link that starts with youtube.com or youtu.be |
| `video_not_public` | This video is private or unlisted, so it can't be described. | Choose a public video |
| `video_not_embeddable` | The owner of this video doesn't allow it to play on other sites. | Choose another video |
| `video_is_live` | Live streams can't be described yet. | Try again after the stream ends |
| `video_too_long` | This video is {minutes} minutes long. The limit is 45 minutes. | Choose a shorter lecture |
| `daily_limit_reached` | You've reached today's limit. | Your limit resets at midnight India time; your Library still works |
| `video_not_found` | We couldn't find this lecture. | Go to Library |
| `video_not_ready` | This lecture is still being prepared. | Go to the progress page |
| `invalid_token` | You've been signed out. | Sign in again |
| `network_error` | Ishaara can't reach the server. | Check your connection; it will retry |
| anything else | Something went wrong on our side. | Try again in a minute |

The minutes in `video_too_long` come from parsing `detail`; if parsing fails, the message drops the number.

## Narrated player engine

One XState machine, `narratedPlayerMachine`, owns the watch page: at each cue's `startSeconds` it pauses the video, speaks the description, then resumes. It never touches the DOM directly; it calls `VideoPlayerPort` and `NarrationAudioPort`, so its tests run in Node with fake ports and fake timers.

&#91;embedded content: narrated player states · 7 states, narrating highlighted\]

Seek, repeat and next or previous description work from any active state and are listed in the transition table; asking is also reachable from playing and narrating.

**Context**

```ts
interface NarratedPlayerContext {
  cues: readonly NarrationCue[];          // sorted by startSeconds
  nextCueIndex: number;                    // first cue not yet narrated or skipped
  activeCue: NarrationCue | null;
  lastNarratedCue: NarrationCue | null;    // for Repeat
  currentSeconds: number;
  settings: Pick<Preferences, "narrationOutput" | "narrationRate" | "autoPauseForCues" | "playEarcons">;
  answer: QuestionAnswer | null;
  errorCode: string | null;
}

type NarratedPlayerEvent =
  | { type: "PLAYER_READY" }
  | { type: "PLAY" } | { type: "PAUSE" } | { type: "TOGGLE" }
  | { type: "TICK"; seconds: number }              // from a 100 ms poll while playing
  | { type: "SEEK"; seconds: number }              // J, L, cue list, ?t=
  | { type: "NEXT_CUE" } | { type: "PREVIOUS_CUE" }
  | { type: "REPEAT" } | { type: "SKIP" } | { type: "RESUME" }
  | { type: "NARRATION_ENDED" } | { type: "NARRATION_FAILED" }
  | { type: "ASK" } | { type: "ANSWER_RECEIVED"; answer: QuestionAnswer } | { type: "ANSWER_DONE" }
  | { type: "VIDEO_ENDED" } | { type: "PLAYER_ERROR"; code: number }
  | { type: "SETTINGS_CHANGED"; settings: NarratedPlayerContext["settings"] };
```

**Transition rules**

| From | Event | Guard | To | Actions |
| --- | --- | --- | --- | --- |
| `loading` | `PLAYER_READY` |  | `paused` | seek to `?t=` if present; arm the first cue at or after it |
| `paused` | `PLAY` or `TOGGLE` |  | `playing` | `video.play()`; start the 100 ms poll |
| `playing` | `TICK` | next cue's `startSeconds - 0.15 <= seconds` and `autoPauseForCues` | `narrating` | `video.pause()`; stop poll |
| `playing` | `TICK` | same, but auto-pause is off | `playing` | play narration over the video with YouTube volume ducked to 30 percent |
| `narrating.speaking` | entry | `narrationOutput = audio` and `audioUrl` set |  | optional earcon; `audio.play(url, rate)`; show text in *Now describing* |
| `narrating.awaitingResume` | entry | `screen_reader` mode, or no `audioUrl`, or `NARRATION_FAILED` |  | send text to the assertive live region; focus stays where it was |
| `narrating` | `NARRATION_ENDED`, `SKIP`, `RESUME`, `TOGGLE` |  | `playing` | `audio.stop()`; mark cue done; advance `nextCueIndex`; `video.play()` |
| `narrating` | `REPEAT` |  | `narrating` | re-enter with the same cue |
| `playing` or `paused` | `REPEAT` | `lastNarratedCue` exists | `narrating` | narrate it again; on end return to the previous state |
| any active | `SEEK` |  | same state | `video.seekTo()`; `nextCueIndex` = first cue at or after the new time; cues jumped over are not played |
| any active | `NEXT_CUE` / `PREVIOUS_CUE` |  | `narrating` | seek to that cue's time minus 2 seconds and narrate it |
| `playing`, `paused`, `narrating` | `ASK` |  | `asking` | stop audio; `video.pause()`; focus the question field |
| `asking` | `ANSWER_RECEIVED` |  | `asking.answering` | show and announce the answer; play `answer_audio_url` |
| `asking` | `ANSWER_DONE` |  | `paused` | focus returns to the Ask button |
| `playing` | `VIDEO_ENDED` |  | `ended` | announce "Lecture finished. Notes are available." |
| any | `PLAYER_ERROR` |  | `error` | announce the mapped YouTube error; show *Open on YouTube* and *Read notes* |

**Edge cases the tests must cover**

- Two cues within 0.3 s after a seek: only the later one is armed.
- The user presses Play while narration is speaking: narration stops, video plays, cue is marked done.
- Narration audio fails to load (`error` event or `play()` rejection): that cue uses `awaitingResume`; the next cue tries audio again.
- Settings change during narration: applies from the next cue.
- Tab hidden (`visibilitychange`): if playing, keep going; if narrating, keep speaking (audio continues in background tabs).
- `?t=` beyond the last cue: no cue is armed; playback works normally.

**Components on the watch page**

- `PlayerShell` creates the actor with `useActorRef`, wires ports, registers hotkeys.
- `ControlBar`, `NowDescribing`, `CueList`, `AskPanel` each read only what they need with `useSelector`.
- `CueList` marks the active item with `aria-current="true"` and does not move focus; it scrolls the item into view only when focus is already inside the list.

## Milestones

F0 to F8 make a complete, deployed, audited frontend in about 19 hours. Everything runs against MSW mocks first, so the frontend never waits for the backend; each milestone ends with a real-backend check once the matching backend milestone is live.

&#91;embedded content: frontend milestones · 9 blocks over 2 days, 4 backend gates\]

If F4 overruns, ship the fallback in *Risks and fallbacks* (cue list without auto-pause) before cutting anything else.

### F0 · Project setup (1.5 h)

- [ ] `bunx create-next-app@latest ishaara-web --ts --app --src-dir --tailwind --biome --use-bun`; keep the generated `AGENTS.md` and add this plan's working rules to it
- [ ] Add deps: `bun add @tanstack/react-query xstate @xstate/react zustand zod firebase react-aria-components react-hook-form @hookform/resolvers next-intl dompurify`
- [ ] Dev deps: `bun add -d vitest @testing-library/react @testing-library/user-event vitest-axe jsdom msw @playwright/test @axe-core/playwright @types/dompurify`
- [ ] `tsconfig.json` strict flags; `next.config.ts` with `output: 'export'`, `typedRoutes: true`; `biome.json` with a11y rules as errors
- [ ] `src/env.ts` (Zod over `NEXT_PUBLIC_API_BASE_URL`, `NEXT_PUBLIC_FIREBASE_*`); `.env.example`
- [ ] `package.json` scripts for every Definition of done command

**Acceptance:** `bun run dev` serves a blank page on port 3000; `bun run build` writes `out/`; all Definition of done commands pass on the empty app.

### F1 · API layer and types (2 h)

- [ ] `lib/api/schemas.ts` and `errors.ts` exactly as in *Types and data models*
- [ ] `lib/api/client.ts`: `apiRequest<Schema>(path, { method, body, schema })` adds the bearer token, sets `Accept: application/json`, a 15-second `AbortSignal.timeout`, parses problem+json into `ApiError`, and validates success bodies with the schema
- [ ] `lib/api/endpoints.ts`: one typed function per backend route; `hooks.ts`: the hooks in *Backend integration*
- [ ] `lib/youtube-url.ts` mirroring the backend's accepted forms
- [ ] `tests/msw/handlers.ts` for every route, including every error code and a scripted job that advances one stage per poll
- [ ] Compare schemas with the live `/openapi.json`; record differences in `docs/DECISIONS.md`

**Acceptance:** unit tests cover all 7 valid and 5 invalid URL forms, every schema against fixtures, and `toUserMessage` for every code; a hook test shows `useVideoStatus` stops polling at `ready`.

### F2 · Shell, auth and accessibility foundations (2.5 h)

- [ ] `tokens.css` (light, dark, high contrast, forced colours), fonts, `globals.css` with the focus ring
- [ ] Root `layout.tsx`: `<html lang>`, skip link, header with nav (Home, Library, Settings, Sign out), `main id="main"`, providers
- [ ] `AnnouncerProvider`, `useAnnounce`, focus-to-`h1` on route change, `document.title` helper
- [ ] `components/ui/` primitives on React Aria Components
- [ ] Firebase Auth: Google and email link; `AuthGate` with `?next=` redirect
- [ ] Zustand preferences store; theme and text scale applied on `<html>`
- [ ] `next-intl` with `en` and `hi` message files

**Acceptance:** Playwright: keyboard-only sign-in works; skip link is the first Tab stop; axe passes on Sign in and an empty Home in all three themes; a token test proves every text pair is 7:1 or more.

### F3 · Submit and processing (2 h)

- [ ] Home: `LinkForm` with React Hook Form + Zod, language radios, recent videos
- [ ] Submit flow: `200` → Watch, `202` → Processing; every error code rendered with its next step
- [ ] Processing: stage list, `progress` with `aria-valuetext`, throttled announcements, auto-navigate on `ready`, retry on `failed`

**Acceptance:** journey 3 (failure) passes with MSW; the processing screen announces each stage once; real-backend check after backend M3: a real link reaches `stage=writing` on screen.

### F4 · Player machine (3 h, highest risk)

- [ ] `cue-index.ts` pure helpers
- [ ] `narrated-player.machine.ts` implementing the transition table
- [ ] `youtube-player-port.ts` (IFrame API loaded once, player vars from *Accessibility requirements*) and `narration-audio.ts` (one reused `Audio` element, earcons)
- [ ] Machine tests for every row of the transition table and every edge case, with fake ports and fake timers

**Acceptance:** machine tests pass with no browser; a scratch page plays a real demo video and pauses within 250 ms of each cue time in Chrome, Firefox and Safari.

### F5 · Watch page (2.5 h)

- [ ] `PlayerShell`, `ControlBar`, `NowDescribing`, `CueList`, hidden `<track kind="descriptions">` from `cues.vtt`
- [ ] Hotkeys and the shortcuts dialog; single-key toggle respected
- [ ] `?t=` deep links; *Open on YouTube at this time* fallback
- [ ] Both `narrationOutput` modes

**Acceptance:** journey 2 passes keyboard-only; axe passes on Watch; manual NVDA + Firefox and VoiceOver + Safari runs hear every description in a 10-minute demo without overlap (after backend M4).

### F6 · Questions and notes (2 h)

- [ ] `AskPanel`: labelled textarea (500 characters, live remaining count announced only at 50 and 0), *Ask about this moment* sends `at_seconds`; answer shown, announced and played; `referenced_seconds` rendered as jump links
- [ ] `NotesView`: sanitised HTML, `h2` per section, `[Board, mm:ss]` links to Watch, download and print

**Acceptance:** journey 1 passes end to end with MSW; real question answered after backend M6; Notes page passes axe and prints cleanly.

### F7 · Library and settings (1.5 h)

- [ ] Library list, empty state, status per item
- [ ] Settings page with grouped controls; each change announced and applied live

**Acceptance:** keyboard-only change of narration speed is heard on the next cue; Library shows the last 20 videos newest first.

### F8 · Audit, polish and deploy (2 h)

- [ ] Full manual screen-reader matrix; fix every blocker; log in `docs/a11y-audit.md`
- [ ] 400 percent zoom and 320 px reflow check on every screen; forced-colours check on Windows
- [ ] Lighthouse accessibility 100 on every screen
- [ ] Firebase Hosting deploy with CSP headers; run journey 2 against production with the 3 demo videos
- [ ] `README.md`: setup, env vars, scripts, deploy

**Acceptance:** zero open blockers in the audit log; demo videos open in the player instantly from production.

## Testing and deployment

Three layers, all runnable with Bun and none touching the real backend except the final smoke test.

| Layer | Tool | What it covers | Target |
| --- | --- | --- | --- |
| Unit | Vitest | Pure functions (`parseYouTubeVideoId` with the backend's 7 valid and 5 invalid forms, `findNextCue`, `formatSpokenDuration`), Zod schemas against fixtures, `toUserMessage` for every code | 100 percent of `lib/` and `machine/` |
| Machine | Vitest + XState test utilities | Every transition in the player machine with fake ports and fake timers | Every state and event pair in the transition table |
| Component | Vitest + Testing Library + `vitest-axe` | Forms, error wiring, live-region calls, focus after route change | No axe violations |
| E2E | Playwright + MSW + `@axe-core/playwright` | The three journeys below, keyboard only, in Chromium, Firefox and WebKit | Zero serious or critical axe issues per screen |

**The three journeys** (also the manual screen-reader script)

1. *New video:* sign in, paste a link, choose Hindi, submit, hear progress, land on Watch, hear the first description, press `R` to repeat, press `N` twice, ask "What was on the board just now?", hear the answer.
2. *Cached video:* paste a demo link, land on Watch directly, open Notes, follow a `[Board, 12:40]` link back to that moment.
3. *Failure:* paste a private video link, hear the error, fix the link, succeed.

MSW fixtures include a scripted job that advances one stage per poll, so journey 1 runs in under 20 seconds in CI.

**Deploy**

```bash
bun run build                 # next build → out/
bunx firebase deploy --only hosting
```

`firebase.json` serves `out/` with `cleanUrls: true`, a 404 rewrite to `/404.html`, long cache headers on `/_next/static/**`, and security headers: `Content-Security-Policy` allowing `https://www.youtube.com`, `https://*.ytimg.com`, the Cloud Run API origin, `https://storage.googleapis.com` for audio, and Firebase Auth domains. After deploy, run journey 2 against production with the 3 pre-processed demo videos.

## Risks and fallbacks

| Risk | Effect | Mitigation |
| --- | --- | --- |
| Browser autoplay policy blocks narration audio | First cue is silent; video stays paused | The first cue only plays after a user gesture (pressing Play counts). If `audio.play()` rejects, switch that cue to `screen_reader` behaviour and announce it |
| YouTube IFrame API timing drift (`getCurrentTime` is only polled) | A cue fires up to 250 ms late | Poll every 100 ms while playing; pause when `currentTime >= cue.startSeconds - 0.15` |
| User seeks past several cues | A burst of narrations | Seeking never queues; the machine marks skipped cues and only the cue nearest after the new time is armed |
| Screen reader and narration overlap | Two voices at once | `narrationOutput` setting; on cue start, the polite live region is cleared |
| YouTube player inaccessible on some mobile browsers | Custom controls fail | Fallback link "Open on YouTube at 12:40" plus the VTT description track and Notes |
| Backend response shapes differ from this plan | Zod parse errors | Caught in F1 against `/openapi.json`; schemas are the single place to change |
| Static export limits (no middleware, no server routes) | Auth guard must run client-side | `AuthGate` component redirects after `onAuthStateChanged`; protected pages render a labelled loading state, not a blank page |
| Hindi rendering differs across screen readers | Mispronounced Hindi | `lang="hi"` on every Hindi span; test with NVDA and TalkBack Hindi voices in the F6 audit |

**Fallback if the narrated player slips:** ship Watch with the YouTube player plus the *Described moments* list and Notes, with no auto-pause. Users can still jump to and hear each description. Everything else in the plan is unchanged.
