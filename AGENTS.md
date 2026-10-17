<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Ishaara conventions

Full detail in `docs/implementation_plan.md`. Read it before writing code.

- Work the milestones (F0-F8) in order; a milestone is done only when every acceptance check passes.
- `GET /openapi.json` is the source of truth for wire shapes over this plan. Disagreements go in `docs/DECISIONS.md`.
- Never call `fetch` outside `src/lib/api/`; components and hooks use the typed client only.
- Never touch the YouTube IFrame API outside `src/features/player/youtube/`; the player machine talks to it through `VideoPlayerPort`.
- Every interactive element is a real HTML control (`button`, `a`, `input`, `select`). No `div onClick`, no positive `tabindex`.
- Every user-visible string lives in `src/messages/{en,hi}.json`. No hard-coded copy in components.
- Secrets and config come from `NEXT_PUBLIC_*` env vars validated at boot by `src/env.ts`. Never commit `.env.local`.
- Commit after each milestone with message `feat(fN): <summary>`.
- TypeScript strict plus `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `noImplicitOverride`. No `any`; narrow `unknown`.
- Types derive from Zod schemas with `z.infer`/`z.output`; never hand-write a type that duplicates a schema.
- Server Components by default; add `"use client"` only to the leaf that needs state, effects or browser APIs.
- Names say what things are (`videoKey`, `cueStartSeconds`); no `data`, `res`, `tmp`, `item` outside a two-line callback.
- Components stay under ~120 lines, hooks under ~60. Pure logic lives in plain functions with unit tests.
- TSDoc on every exported function, hook and component: what it does, params, return, what it throws.
- Biome is the one lint/format tool; a11y rules are errors.
- Definition of done for every milestone: `bun run typecheck`, `bun run lint`, `bun run test`, `bun run build`. (Playwright/axe E2E, `bun run test:a11y` in the plan, is deliberately not wired up yet.)
