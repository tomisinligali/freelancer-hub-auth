"use server";

import crypto from "crypto";
import { headers } from "next/headers";
import { prisma } from "@/lib/db/prisma";
import { validateForgotPasswordInput } from "@/lib/validation/auth";
import {
  getClientIp,
  isLoginLocked,
  recordLoginFailure,
  clearLoginFailures,
  lockedMessage,
} from "@/lib/auth/rate-limit";
import { enqueuePasswordResetEmail } from "@/lib/background/email-jobs";

export interface ForgotPasswordResponse {
  success: boolean;
  error?: string;
  message?: string;
}

export async function forgotPasswordAction(formData: FormData): Promise<ForgotPasswordResponse> {
  const headerList = await headers();
  const ip = getClientIp(headerList);

  const validation = validateForgotPasswordInput(formData);
  const email = validation.success && validation.data ? validation.data.email : null;

  if (!email) {
    // Unparseable input counts as a failed attempt (keyed to ip by empty email)
    await recordLoginFailure("", ip);
    return { success: false, error: validation.error || "Valid email is required." };
  }

  const lockedMinutes = await isLoginLocked(email, ip);
  if (lockedMinutes > 0) {
    return { success: false, error: lockedMessage(lockedMinutes) };
  }

  try {
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      // Don't leak user existence; returning a generic positive response is still
      // a "no email sent" outcome, so it has a cost (anti-enumeration).
      await recordLoginFailure(email, ip);
      return {
        success: true,
        message: "If that email address is in our system, you will receive a password reset link shortly.",
      };
    }

    // Security Rule 7: Password-reset tokens must expire after one hour
    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    // Clean up any existing reset tokens for this user
    await prisma.verificationToken.deleteMany({
      where: {
        identifier: email,
        type: "password_reset",
      },
    });

    await prisma.verificationToken.create({
      data: {
        identifier: email,
        token,
        type: "password_reset",
        expiresAt,
      },
    });

    // A real reset email was (about to be) prepared — clear accumulated failures
    await clearLoginFailures(email, ip);

    // Background job: email the one-time reset link (fired exactly once)
    enqueuePasswordResetEmail(email, token);

    return {
      success: true,
      message: "If that email address is in our system, you will receive a password reset link shortly.",
    };
  } catch (err: unknown) {
    console.error("Forgot password error:", err);
    await recordLoginFailure(email, ip);
    return {
      success: false,
      error: "An unexpected error occurred. Please try again later.",
    };
  }
}