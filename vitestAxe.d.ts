// vitest-axe@0.1.0 types its matcher for an older Vitest (`Vi.Assertion`), which this
// project's Vitest 5 no longer merges into `expect()`. Augment the real extension point
// (`Matchers<R, T>`, documented in the `vitest` package) ourselves.
declare module "vitest" {
  interface Matchers<R = void, T = unknown> {
    toHaveNoViolations(): R;
  }
}

export {};
