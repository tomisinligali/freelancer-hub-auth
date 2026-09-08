"use server";

import { prisma } from "@/lib/db/prisma";

export interface VerifyEmailResponse {
  success: boolean;
  error?: string;
  message?: string;
}

export async function verifyEmailAction(code: string): Promise<VerifyEmailResponse> {
  const trimmedCode = typeof code === "string" ? code.trim() : "";
  if (!trimmedCode) {
    return { success: false, error: "Verification code is required." };
  }

  try {
    const record = await prisma.verificationToken.findUnique({
      where: { token: trimmedCode },
    });

    if (!record || record.type !== "email_verification") {
      return { success: false, error: "Invalid or expired verification code." };
    }

    if (new Date() > record.expiresAt) {
      // Code expired, cleanup
      await prisma.verificationToken.delete({
        where: { id: record.id },
      });
      return {
        success: false,
        error: "Verification code has expired. Please request a new one.",
      };
    }

    const user = await prisma.user.findUnique({
      where: { email: record.identifier },
    });

    if (!user) {
      return { success: false, error: "User account not found." };
    }

    // Mark email as verified
    await prisma.user.update({
      where: { id: user.id },
      data: { emailVerified: new Date() },
    });

    // The verification code can only be used once
    await prisma.verificationToken.delete({
      where: { id: record.id },
    });

    return {
      success: true,
      message: "Email verified successfully! You can now sign in to your account.",
    };
  } catch (err: unknown) {
    console.error("Email verification error:", err);
    return {
      success: false,
      error: "An unexpected error occurred during verification. Please try again.",
    };
  }
}