# Backend requests

Frontend-driven asks for fields the real API (`docs/postman/ishaara.postman_collection.json`)
doesn't currently return. Each is modeled as an **optional** field in the frontend's Zod
schemas already, so the UI picks it up the moment it exists with no further frontend change.
Until then, the UI falls back gracefully (hides the piece of copy that needs it).

## 1. `GET /v1/me/videos` — add `duration_seconds`, `status`, `error_message` per item

Current response item shape: `{ video_key, title, submitted_at }`.

Needed for:

- **Home's "recently submitted" list** (`RecentVideos.tsx`, up to 3 items) and the planned
  **Library screen** (F7, up to 20 items) both need to show each video's duration ("42
  minutes") and status (ready / processing / failed), and whether a ready item should
  link to Watch at all.
- Without these fields, the only way to get them today is one extra `GET
  /v1/videos/{video_key}` per row — fine for 3 rows on Home, a real N+1 cost for a
  20-row Library list.
- `language` doesn't need a new field — it's already recoverable from `video_key`
  itself (`{youtube_id}_{language}_v{pipeline_version}`, parsed by `src/lib/videoKey.ts`).

Proposed shape:

```json
{
  "videos": [
    {
      "video_key": "v8kBd64_WAc_en_v2",
      "title": "Circular Tracks for CAT Exam",
      "submitted_at": "2026-10-17T13:57:30.965069Z",
      "duration_seconds": 527,
      "status": "ready",
      "error_message": null
    }
  ]
}
```

Modeled today as optional fields on `VideoSummarySchema` (`src/lib/api/schemas.ts`).

## 2. `VideoStatusResponse` (`POST /v1/videos`, `GET /v1/videos/{video_key}`) — add `channel_title`

Current response shape: `{ video_key, title, duration_seconds, status, stage,
progress_percent, error_code, error_message }` — no channel at all.

Needed for:

- The Watch page's "title and channel" header region (`docs/implementation_plan.md`'s
  Screens and flows, Watch description) and Processing's byline under the title.
- There's no way to recover this from `video_key` (unlike language) — it's not encoded
  anywhere in the key, so this one genuinely needs a new backend field.

Modeled today as an optional field on `VideoStatusResponseSchema` (`src/lib/api/schemas.ts`).
Until it exists, Processing's byline and Watch's header show title only, no channel.
