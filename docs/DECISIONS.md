# Decisions

Log of places where the live backend (`/openapi.json`) or real-world behaviour disagreed with `docs/implementation_plan.md`, and what we changed.

## F1 · No live backend to compare schemas against yet

No backend URL or `/openapi.json` was reachable while building the API layer, so the following were implemented from the plan alone and still need confirming once the backend is up:

- **Notes response shape.** The plan doesn't specify a schema for `GET /v1/videos/{video_key}/notes?format=html` (only that the frontend sanitises its HTML before render). Implemented `getNotesHtml` to fetch and return the raw response body as text (`apiRequestText` in `src/lib/api/client.ts`), rather than a JSON-wrapped field. Confirm the real content type and body shape against `/openapi.json`.
- **YouTube URL forms.** `src/lib/youtube-url.ts` mirrors "the backend's accepted forms" per the plan, but the backend's exact list of valid/invalid forms isn't in this plan. Implemented the common forms (`watch?v=`, `youtu.be/`, `/embed/`, `/shorts/`, `www.`/`m.` subdomains, with/without scheme, extra query params). Confirm against the backend's actual validator.
- **`VideoStatusResponse` / `VideoSummary` fields**, already flagged as inferred in the plan — implemented exactly as the plan's *Types and data models* section specifies. Still unconfirmed against `/openapi.json`.
