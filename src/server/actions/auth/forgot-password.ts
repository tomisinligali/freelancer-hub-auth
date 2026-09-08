"use server";

import crypto from "crypto";
import { headers } from "next/headers";
import { prisma } from "@/lib/db/prisma";
import { validateForgotPasswordInput } from "@/lib/validation/auth";
import { checkRateLimit, RATE_LIMITS } from "@/lib/security/rate-limit";

export interface ForgotPasswordResponse {
  success: boolean;
  error?: string;
  message?: string;
  resetToken?: string; // provided for development/testing ease
}

export async function forgotPasswordAction(formData: FormData): Promise<ForgotPasswordResponse> {
  const headerList = await headers();
  const ip =
    headerList.get("x-forwarded-for")?.split(",")[0].trim() ||
    headerList.get("x-real-ip") ||
    "127.0.0.1";

  // Rate limit: 5 attempts per 15 min per IP (Security Rule 22)
  const rateLimit = checkRateLimit(`pwd_reset:${ip}`, RATE_LIMITS.PASSWORD_RESET);
  if (!rateLimit.allowed) {
    return {
      success: false,
      error: "Too many password reset attempts. Please try again in 15 minutes.",
    };
  }

  const validation = validateForgotPasswordInput(formData);
  if (!validation.success || !validation.data) {
    return { success: false, error: validation.error || "Valid email is required." };
  }

  const email = validation.data.email;

  try {
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      // Don't leak user existence; return generic positive response
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

    return {
      success: true,
      message: "If that email address is in our system, you will receive a password reset link shortly.",
      resetToken: token,
    };
  } catch (err: unknown) {
    console.error("Forgot password error:", err);
    return {
      success: false,
      error: "An unexpected error occurred. Please try again later.",
    };
  }
}
