"use server";

import { signOut } from "@/lib/auth/auth";

/**
 * Server-side logout: terminates the session on the server (clears the
 * session + CSRF cookies) and redirects to the auth page.
 */
export async function signOutAction(): Promise<void> {
  await signOut({ redirectTo: "/auth" });
}