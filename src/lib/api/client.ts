import type { z } from "zod";
import { env } from "@/env";
import {
  ApiError,
  ErrorCode,
  type KnownErrorCode,
  ProblemDetailsSchema,
} from "@/lib/api/errors";
import { auth } from "@/lib/firebase";

const REQUEST_TIMEOUT_MS = 15_000;

type Method = "GET" | "POST" | "PATCH" | "DELETE";

async function parseProblemDetails(
  response: Response,
): Promise<{ code?: string | undefined; detail?: string | undefined }> {
  try {
    const result = ProblemDetailsSchema.safeParse(await response.json());
    return result.success ? result.data : {};
  } catch {
    return {};
  }
}

function toKnownErrorCode(code: string | undefined): KnownErrorCode {
  const options: readonly string[] = ErrorCode.options;
  return code && options.includes(code)
    ? (code as KnownErrorCode)
    : "unknown_error";
}

/**
 * Fetches `path` against the configured API base, attaching the current
 * Firebase ID token. Retries once with a forced token refresh on
 * `invalid_token`, signing the user out if the retry also fails.
 * @throws {ApiError} on a non-2xx response, a network failure, or a timeout
 */
async function performFetch(
  path: string,
  method: Method,
  body: unknown,
  isRetry: boolean,
): Promise<Response> {
  const token = await auth.currentUser?.getIdToken(isRetry);

  let response: Response;
  try {
    response = await fetch(`${env.NEXT_PUBLIC_API_BASE_URL}${path}`, {
      method,
      headers: {
        Accept: "application/json",
        ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  } catch {
    throw new ApiError(0, "network_error", undefined);
  }

  if (response.ok) {
    return response;
  }

  const problem = await parseProblemDetails(response);
  const code = toKnownErrorCode(problem.code);

  if (code === "invalid_token") {
    if (!isRetry) {
      return performFetch(path, method, body, true);
    }
    await auth.signOut();
  }

  throw new ApiError(response.status, code, problem.detail);
}

interface JsonRequestOptions<Schema extends z.ZodType> {
  method?: Method;
  body?: unknown;
  schema: Schema;
}

/**
 * Calls a JSON endpoint and validates the response body with `schema`.
 * @throws {ApiError} on failure; a schema mismatch throws a Zod error instead
 */
export async function apiRequest<Schema extends z.ZodType>(
  path: string,
  { method = "GET", body, schema }: JsonRequestOptions<Schema>,
): Promise<z.output<Schema>> {
  const response = await performFetch(path, method, body, false);
  return schema.parse(await response.json());
}

/** Calls an endpoint that returns a raw text body (for example sanitised HTML notes). */
export async function apiRequestText(
  path: string,
  { method = "GET", body }: { method?: Method; body?: unknown } = {},
): Promise<string> {
  const response = await performFetch(path, method, body, false);
  return response.text();
}
