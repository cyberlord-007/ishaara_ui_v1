process.env.NEXT_PUBLIC_API_BASE_URL ??= "https://api.test.ishaara.app";
process.env.NEXT_PUBLIC_FIREBASE_API_KEY ??= "test-api-key";
process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ??= "test.firebaseapp.com";
process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ??= "test-project";
process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ??= "test-project.appspot.com";
process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ??= "000000000000";
process.env.NEXT_PUBLIC_FIREBASE_APP_ID ??=
  "1:000000000000:web:0000000000000000000000";

import { afterAll, afterEach, beforeAll } from "vitest";
import { resetScriptedJobs } from "./tests/msw/handlers";
import { server } from "./tests/msw/server";

beforeAll(() => server.listen({ onUnhandledFrame: "error" }));
afterEach(() => {
  server.resetHandlers();
  resetScriptedJobs();
});
afterAll(() => server.close());
