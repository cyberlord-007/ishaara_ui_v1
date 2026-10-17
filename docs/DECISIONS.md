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
