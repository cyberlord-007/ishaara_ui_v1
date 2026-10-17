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
- Design tokens live in `src/styles/tokens.css` as Tailwind v4 `@theme` values (`bg-surface`, `text-ink`, `rounded-panel`, etc.), re-pointed per theme via `[data-theme]` selectors and `prefers-color-scheme`/`forced-colors` media queries. `src/styles/tokens.test.ts` parses this file directly and checks contrast — don't duplicate token values elsewhere as literals.
- The highlighter mark (`--color-highlighter`, `#FFD43B`) is the same colour in every theme, so text painted on it must always be a fixed dark ink (`#0f1c3f`), never `text-ink`/`--color-ink` — that token goes near-white in dark mode.
- A form field built on React Aria Components (`TextField`, `RadioGroup`, …) wires to React Hook Form with `Controller`, not `register()` — RAC's `onChange` hands back a value, not an event, so `register()`'s event-shaped handlers don't fit.
- `router.push`/`replace` only accept the app's known static routes as literal strings (Next's typed-routes codegen, `.next/types/routes.d.ts`) or a `UrlObject`; a dynamically computed path (e.g. a `?next=` redirect target) needs `import type { Route } from "next"` and an explicit `as Route` cast — there's no generic escape hatch for computed strings.
- Same cast for `<Link href={item.href}>` when `item.href` comes from `.map()` over an array of route literals (see `Header.tsx`'s `NAV_ITEMS`): TypeScript infers `Link`'s generic from one union member and then rejects the others, even though each is individually a valid static route. `bun run typecheck`'s standalone `next typegen` doesn't always catch this — `next build`'s own type-check pass does, so don't treat a clean `typecheck` run alone as proof a nav array is fine.
- Any component calling `useSearchParams()` must be wrapped in `<Suspense>` (see `AuthGate`, `sign-in/page.tsx`) — required for `output: 'export'` to prerender the route.
- `usePreferencesStore` uses Zustand's `persist` with `skipHydration: true`; something must call `usePreferencesStore.persist.rehydrate()` once after mount (done in `providers/PreferencesEffects.tsx`) so the server/first-client render stay in sync before localStorage values apply.
- File names mirror the casing of what they export: PascalCase for a file whose primary export is a React component (`AuthGate.tsx`, `Header.tsx`, `QueryProvider.tsx`), camelCase for a hook, store or plain utility module (`useFocusOnMount.ts`, `preferencesStore.ts`, `youtubeUrl.ts`). Next.js's reserved file names (`page.tsx`, `layout.tsx`, `not-found.tsx`) and route-segment directory names (`sign-in/`, which is also the URL) are exempt — don't rename those.
- `useFocusOnMount`/`useDocumentTitle` must be called inside the component that actually renders the target `h1`, not in an ancestor — e.g. inside `AuthGate`'s `children`, not in the page component that passes `children` to it. `AuthGate` may render its own loading state on first mount instead, so a ref/effect set up any higher never sees the real heading. Every current page follows this via a small `*Content` inner component (see `page.tsx`, `library/page.tsx`, `settings/page.tsx`, `profile/page.tsx`).
- Every route-change auto-focus target (`<h1 ref={headingRef} tabIndex={-1}>`) also needs the `route-heading` class (`globals.css`). Without it, most browsers' `:focus-visible` heuristic matches script-triggered `.focus()`, so the global focus ring rings the heading on every page load for mouse/touch users — safe to suppress only here because `tabIndex={-1}` means Tab can never reach it anyway.
