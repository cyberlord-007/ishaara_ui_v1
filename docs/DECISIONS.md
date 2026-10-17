# Decisions

Log of places where the live backend (`/openapi.json`) or real-world behaviour disagreed with `docs/implementation_plan.md`, and what we changed.

## F1 · No live backend to compare schemas against yet

No backend URL or `/openapi.json` was reachable while building the API layer, so the following were implemented from the plan alone and still need confirming once the backend is up:

- **Notes response shape.** The plan doesn't specify a schema for `GET /v1/videos/{video_key}/notes?format=html` (only that the frontend sanitises its HTML before render). Implemented `getNotesHtml` to fetch and return the raw response body as text (`apiRequestText` in `src/lib/api/client.ts`), rather than a JSON-wrapped field. Confirm the real content type and body shape against `/openapi.json`.
- **YouTube URL forms.** `src/lib/youtubeUrl.ts` mirrors "the backend's accepted forms" per the plan, but the backend's exact list of valid/invalid forms isn't in this plan. Implemented the common forms (`watch?v=`, `youtu.be/`, `/embed/`, `/shorts/`, `www.`/`m.` subdomains, with/without scheme, extra query params). Confirm against the backend's actual validator.
- **`VideoStatusResponse` / `VideoSummary` fields**, already flagged as inferred in the plan — implemented exactly as the plan's *Types and data models* section specifies. Still unconfirmed against `/openapi.json`.

## F2 · Design artifact grew a "Me" / Profile screen not in the written plan

The design artifact (`docs/implementation_plan.md` → "Design") was updated after F0-F8 were planned, adding:

- A **"Me" nav item** on every screen, alongside Home/Library/Settings/Sign out.
- A new **Profile screen** (`project/Profile.dc.html`): avatar initials, editable display name, email, sign-in provider, member-since date, a default-narration-language radio group, a "Save changes" button, activity stats (lectures described, described today, time listened), and a link to Settings plus a second Sign out button.
- **Home** gained a personalised "Welcome back, {name}" heading and a "Pick up where you left off" resume card (last-watched title, timestamp, "Continue listening"), demoting the link-submission form to a secondary `h2` ("Describe a new lecture").

None of this has a backend contract — the plan's *Backend integration* table has no route for a user's display name, sign-in provider, member-since date, activity stats, or "last watched" state. Built the parts that don't need a backend: a `/me` route (`src/app/me/page.tsx`) showing the avatar (blobatar.dev, keyed on the user's name), editable display name (`updateProfile`), email, sign-in provider and member-since date, all from Firebase Auth, plus the default narration language wired to the existing preferences store. Home's `h1` also gained a time-of-day greeting with the user's first name (`src/lib/time.ts`, `src/lib/name.ts`). Still not built: the design's "Your activity" stats and "Pick up where you left off" resume card, since there is no backend data source for either. Revisit when scoping F3 (Home) and F7 (Library/Settings), or as a new milestone.

## F3 · Submit and processing, built and tested against MSW only

`src/features/submit/` (`LinkForm`, `LanguagePicker`, `RecentVideos`) and `src/features/processing/` (`StageList`, `ProgressAnnouncer`) are now wired into Home and a new `/processing` page exactly per the plan. `/watch` is a minimal stub (`src/app/watch/page.tsx`) — just enough to be a submit/processing destination; the real player is F4/F5.

- No backend is reachable, so every acceptance check here ran against the MSW handlers from F1 (including journey 3: submit a sentinel "private video" URL, see the mapped error, fix the link, succeed — `src/features/submit/LinkForm.test.tsx`). The real-backend check in the plan's F3 acceptance ("a real link reaches `stage=writing` on screen") is unconfirmed.
- `toUserMessage()` (from F1) still returns hard-coded English copy, not `next-intl` keys. F3 is the first milestone that actually renders these messages to users, so this is now a real (not just theoretical) gap for Hindi users: error messages stay in English inside an otherwise-Hindi UI. Not fixed here — it would change `toUserMessage`'s public contract (and its existing tests) beyond what F3 asked for. Worth revisiting before F6/F8's Hindi audit.
- Promoted `toKnownErrorCode()` (narrows an arbitrary string to `KnownErrorCode`) from a private helper in `client.ts` to a shared export in `errors.ts`, since the Processing page needed the same narrowing for `VideoStatusResponse.error_code` that the API client already did for problem+json's `code`.

## F4 · Narrated player engine — machine and ports built, not yet wired into a route

`src/features/player/machine/narratedPlayerMachine.ts` (plus `cueIndex.ts`, `playerErrorCodes.ts`) and the two real ports (`youtube/youtubePlayerPort.ts`, `youtube/loadIframeApi.ts`, `audio/narrationAudio.ts`) are built per the plan's design decisions (see `/Users/aakash-mac/.claude/plans/quiet-crunching-cerf.md`, or ask for a recap — the decisions aren't duplicated here). 117 unit tests pass with fake ports and fake timers, no browser. Gaps:

- **No real-browser verification.** The plan's other F4 acceptance clause — a scratch page playing a real demo video and pausing within 250ms of each cue time in Chrome, Firefox and Safari — needs a real browser, a real video, and a UI to drive the machine. None of that exists until F5 builds `PlayerShell`/`ControlBar`/`CueList`. Flagging this now rather than silently treating F4 as fully verified.
- **No earcon assets.** `narratedPlayerMachine.ts`'s `playEarconStart` action is wired (fires `new Audio("/earcons/cue-start.wav").play()` on entering `speaking`, gated on `settings.playEarcons`) but `public/earcons/` has no WAV files yet, so it's a silent no-op until that asset exists. Added `@types/youtube` as a devDependency (types only) for the `YT` global namespace used by `youtubePlayerPort.ts`.
- **Raw `SEEK` during `narrating` is implemented literally** (narration keeps playing; only future-cue bookkeeping updates) per the plan's transition table. When F5 builds `CueList`, a "jump to this cue" click should route through the same path as `NEXT_CUE`/`PREVIOUS_CUE` (seek-and-narrate), not dispatch raw `SEEK` — otherwise clicking a cue while another is narrating would silently do nothing but move the scrub position.

## F4.5 · Reconciled against the real backend contract (`docs/postman/`)

F0-F4 built every schema from the plan's own "inferred, confirm against `/openapi.json`" shapes (per the F1 entry above). The user pointed at `docs/postman/ishaara.postman_collection.json` — a real, tested collection (25 requests, 33 saved example responses, `pm.test` assertions on every request) — as the actual contract. Reconciling against it surfaced two **already-shipped bugs** and several schema corrections, before any F5 work started.

**Already-shipped bugs, fixed:**
- `src/features/submit/RecentVideos.tsx` read `narration_language`, `duration_seconds` and `status` straight off history items — none of which the real `/v1/me/videos` returns. Fixed: language is now parsed from `video_key` (`src/lib/videoKey.ts`'s `parseVideoKey`); duration/status are rendered only when present (see the placeholder note below).
- `src/app/processing/page.tsx` rendered `data.channel_title` and `data.narration_language` from the status response — neither field exists there either. Fixed the same way (channel conditional, language parsed from `video_key`).

**Schema corrections (`src/lib/api/schemas.ts`):**
- `VideoStatusResponseSchema`: removed `youtube_video_id` and `narration_language` (not sent — recover both via `parseVideoKey(video_key)`, since `video_key` is `{youtube_id}_{language}_v{pipeline_version}` and the backend's own `pm.test` in the History folder enforces that exact shape).
- `NarrationCueSchema`: added `gap_summary` → `gapSummary` — present on every real cue, missing from our schema entirely.
- `VideoSummarySchema`/`HistoryResponseSchema`: the real `/v1/me/videos` item is only `{ video_key, title, submitted_at }`. Rebuilt as its own schema rather than `.pick()`-ing from `VideoStatusResponseSchema` (the two no longer share a field set).
- `ErrorCode` (`src/lib/api/errors.ts`): added `invalid_request`, `request_too_large`, `youtube_unavailable` — real codes confirmed in the collection's error examples and request descriptions, missing from our enum. `toUserMessage` branches added for each.
- `getCuesVttUrl` → `getCuesVtt` (`src/lib/api/endpoints.ts`): the real `cues.vtt` endpoint needs the bearer token — a `<track src>` can't send one, so this now fetches a `Blob` (new `apiRequestBlob` in `client.ts`) and `useCuesVtt` (`hooks.ts`) turns it into a blob URL, instead of handing out a bare URL "never fetched directly" as the old doc comment claimed. (F5 ended up not consuming this hook at all — see the F5 entry below.)
- `tests/msw/handlers.ts`/`tests/fixtures/*.json` updated to match all of the above (including the real `cue-NNNN` id format and `cues.vtt`'s actual `WEBVTT\nKind: descriptions\nLanguage: ..\n` header), so tests exercise the real shape, not the old guessed one.

**Placeholders — requested backend additions, not yet built:** `channel_title` (on `VideoStatusResponseSchema`) and `duration_seconds`/`status`/`error_message` (on `VideoSummarySchema`) are kept as **optional** fields rather than deleted, because they're real gaps the backend should close, not permanent frontend workarounds. Full rationale and proposed shapes in `docs/backend-requests.md`. Until they exist: Watch/Processing show title only (no channel); `RecentVideos` shows language (parsed, always available) but omits duration/status until the backend adds them, defaulting to **not linking** a recent video rather than guessing it's ready.

**Flagged for F7 (Library), not resolved now:** the plan's Library screen wants per-item language/duration/status for up to 20 videos. Language is free (parsed from `video_key`); duration/status need either the backend addition above or 20 extra `GET /v1/videos/{video_key}` calls on load. Decide at F7, not before.

**`.env.production`** added (not `.env.prod` — Next.js's real convention, auto-loaded for every command except `next dev`), using the real Cloud Run URL from `docs/postman/ishaara-prod.postman_environment.json` and the same Firebase project as `.env.local` (confirmed with the user — one Firebase project for now).

**`biome.json`** excludes `docs/postman/` from lint/format — it's Postman's own exported JSON, re-generated from the Postman app, not source this project maintains formatting for.

## F5 · Watch page — `PlayerShell` and friends, built on the F4 machine

`src/features/player/components/{PlayerShell,ControlBar,NowDescribing,CueList,ShortcutsDialog}.tsx` built per the plan, consuming the F4 machine (`narratedPlayerMachine.ts`) and real ports (`youtubePlayerPort.ts`, `narrationAudio.ts`). `src/app/watch/page.tsx` rewritten: a non-`ready` video is redirected to `/processing?v=` (which already owns all the non-ready-state UI — queued/processing/failed), so Watch only ever renders the error/loading/player states that are actually its own. Gaps and deviations:

- **`cues.vtt` is not consumed.** The plan's F5 checklist calls for a hidden `<track kind="descriptions">` sourced from `cues.vtt`, but `<track>` only attaches to a native `<video>`/`<audio>` element — this player is the YouTube IFrame API, a cross-origin iframe with no way to accept an externally-supplied text track. Confirmed with the user: dropped entirely rather than faked with a non-functional hidden element. `useCuesVtt`/`getCuesVtt` (built in F4.5) stay unused for now; every cue's text is already fully accessible through `NowDescribing`/`CueList`, so nothing is lost functionally.
- **`Q` (focus the question box) and Ask are not wired.** `AskPanel` is explicitly F6's deliverable; wiring the hotkey or a button now, with no field for it to focus, would just pause the video into a silent dead end. Deferred to F6 along with the UI itself.
- **The "Lecture finished. Notes are available." announcement is just "Lecture finished."** for the same reason — `/notes` doesn't exist yet (F6).
- **"Open on YouTube at this time" uses the initial `?t=` seek position, not the live playback position.** Making it track live position would mean lifting it into the inner, actor-aware component (or threading currentSeconds back up); a static link using the start time was judged good enough for a fallback escape hatch, not worth the extra wiring. Revisit if this turns out to matter in practice.
- **Real-browser/NVDA+VoiceOver verification stays out of scope for automated tooling**, same as every prior milestone — the YouTube IFrame API has no jsdom equivalent, so `NarratedPlayerInner` (the actor-aware half of `PlayerShell`) is only exercised indirectly, through `ControlBar`/`NowDescribing`/`CueList`'s own tests against a real actor with fake ports. The `a11ySmoke.test.tsx` Watch case only covers the no-`?v=` error state for the same reason.
- **New machine event**: `JUMP_TO_CUE { cueId }` (`narratedPlayerMachine.ts`), added because `CueList` needs to jump to an *arbitrary* cue by id — `NEXT_CUE`/`PREVIOUS_CUE` only ever move one cue relative to the current position. Mirrors their guarded-array shape exactly; `docs/DECISIONS.md`'s F4 note (`CueList` must not dispatch raw `SEEK`) is honored by construction.
- **`createYouTubePlayerPort` gained two constructor options**, both outside the `VideoPlayerPort` interface itself (consistent with F4's decision that YouTube-specific concerns stay out of the port): `title` (sets the real iframe's `title` attribute via `getIframe()` once `onReady` fires, per the Accessibility requirements' `title="Lecture video: <title>"`) and `onError` (the F4 plan's decision 5 — finally wired here, straight to `actorRef.send({ type: "PLAYER_ERROR", code })`).
- **`components/ui/Slider`'s own doc comment was wrong**: there is no `getValueLabel` prop anywhere in this React Aria Components version — the real mechanism is a children render function on `SliderOutput` (`{ state, defaultChildren }`). Added a `formatValue?: (value: number) => string` prop to the shared `Slider` wrapper that threads through to exactly that, used here for narration speed ("1.25 times").
- **`jest-dom` is not installed in this project.** Component tests use `.toBeTruthy()`/`.toBeNull()` and direct `.getAttribute()` reads, not `.toBeInTheDocument()`/`.toHaveAttribute()` — matching `LinkForm.test.tsx`'s existing style, not a new convention.
- **jsdom has no `scrollIntoView`.** Stubbed as a no-op globally in `vitest.setup.ts`, needed by `CueList`'s "scroll the active item into view, only when focus is already inside the list" effect.
