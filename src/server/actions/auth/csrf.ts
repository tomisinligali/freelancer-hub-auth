"use server";

import { cookies } from "next/headers";
import {
  createCsrfToken,
  CSRF_COOKIE_NAME,
  CSRF_COOKIE_OPTIONS,
} from "@/lib/auth/csrf";

/**
 * Rotates the CSRF double-submit cookie to a fresh signed value.
 * Called before sign-in (so each login attempt uses a new token) and after a
 * successful sign-in (so the authenticated session is never tied to the
 * pre-login token) — mitigating session fixation.
 */
export async function rotateCsrfTokenAction(): Promise<void> {
  const store = await cookies();
  // Auth.js encodes cookie values with encodeURIComponent, so we must write the
  // encoded form for its read path (cookie.parse decode) to yield `token|hash`.
  store.set(CSRF_COOKIE_NAME, encodeURIComponent(createCsrfToken()), CSRF_COOKIE_OPTIONS);
}