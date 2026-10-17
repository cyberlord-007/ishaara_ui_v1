process.env.NEXT_PUBLIC_API_BASE_URL ??= "https://api.test.ishaara.app";
process.env.NEXT_PUBLIC_FIREBASE_API_KEY ??= "test-api-key";
process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ??= "test.firebaseapp.com";
process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ??= "test-project";
process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ??= "test-project.appspot.com";
process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ??= "000000000000";
process.env.NEXT_PUBLIC_FIREBASE_APP_ID ??=
  "1:000000000000:web:0000000000000000000000";

import { cleanup } from "@testing-library/react";
import { afterAll, afterEach, beforeAll, expect } from "vitest";
// vitest-axe@0.1.0's "extend-expect"/"matchers" entry points don't work with Vitest 5
// (see vitestAxe.d.ts); import the real matcher from its dist file and register it here.
import { toHaveNoViolations } from "vitest-axe/dist/matchers.js";
import { toastQueue } from "./src/components/ui/Toast";
import { resetScriptedJobs } from "./tests/msw/handlers";
import { server } from "./tests/msw/server";

expect.extend({ toHaveNoViolations });

// jsdom doesn't implement scrollIntoView; CueList (and anything else that
// scrolls an active item into view) needs a no-op stand-in to not throw.
Element.prototype.scrollIntoView ??= () => {};

beforeAll(() => server.listen({ onUnhandledFrame: "error" }));
afterEach(() => {
  server.resetHandlers();
  resetScriptedJobs();
  // @testing-library/react doesn't auto-register this under Vitest the way it
  // does under Jest, so a file with more than one render() leaks DOM between tests.
  cleanup();
  // toastQueue is a module-level singleton (outside React), so a toast added in
  // one test outlives that test's unmount and reappears in the next test's fresh
  // <ToastRegionRoot>.
  toastQueue.clear();
});
afterAll(() => server.close());
