"use server";

import crypto from "crypto";
import { headers } from "next/headers";
import { prisma } from "@/lib/db/prisma";
import { emailSchema } from "@/lib/validation/auth";
import { enqueueVerificationEmail } from "@/lib/background/email-jobs";
import {
  getClientIp,
  isLoginLocked,
  recordLoginFailure,
  clearLoginFailures,
  lockedMessage,
} from "@/lib/auth/rate-limit";

export interface ResendVerificationResponse {
  success: boolean;
  error?: string;
  message?: string;
}

const RESEND_COOLDOWN_MS = 60_000;
const CODE_TTL_MS = 24 * 60 * 60 * 1000;

export async function resendVerificationEmailAction(
  email: string
): Promise<ResendVerificationResponse> {
  const parsed = emailSchema.safeParse(email);
  const headerList = await headers();
  const ip = getClientIp(headerList);

  if (!parsed.success) {
    await recordLoginFailure("", ip);
    return { success: false, error: "Please enter a valid email address." };
  }

  const normalizedEmail = parsed.data;

  const lockedMinutes = await isLoginLocked(normalizedEmail, ip);
  if (lockedMinutes > 0) {
    return { success: false, error: lockedMessage(lockedMinutes) };
  }

  try {
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (!user) {
      await recordLoginFailure(normalizedEmail, ip);
      return { success: false, error: "No account found for this email." };
    }

    if (user.emailVerified) {
      return {
        success: false,
        error: "Your email is already verified. You can sign in to your account.",
      };
    }

    const now = Date.now();

    const existing = await prisma.verificationToken.findFirst({
      where: {
        identifier: normalizedEmail,
        type: "email_verification",
      },
      orderBy: { createdAt: "desc" },
    });

    if (existing && now - existing.createdAt.getTime() < RESEND_COOLDOWN_MS) {
      return {
        success: false,
        error: `Please wait ${Math.ceil(
          (RESEND_COOLDOWN_MS - (now - existing.createdAt.getTime())) / 1000
        )} seconds before requesting a new code.`,
      };
    }

    const rawCode = crypto.randomBytes(32);
    const verificationCode = (rawCode.readUInt32BE(0) % 1000000)
      .toString()
      .padStart(6, "0");

    await prisma.verificationToken.deleteMany({
      where: { identifier: normalizedEmail, type: "email_verification" },
    });

    await prisma.verificationToken.create({
      data: {
        identifier: normalizedEmail,
        token: verificationCode,
        type: "email_verification",
        expiresAt: new Date(now + CODE_TTL_MS),
      },
    });

    enqueueVerificationEmail(normalizedEmail, verificationCode);

    await clearLoginFailures(normalizedEmail, ip);

    return {
      success: true,
      message: "A new verification code has been sent to your email.",
    };
  } catch (err: unknown) {
    console.error("Resend verification error:", err);
    await recordLoginFailure(normalizedEmail, ip);
    return {
      success: false,
      error: "An unexpected error occurred. Please try again.",
    };
  }
}