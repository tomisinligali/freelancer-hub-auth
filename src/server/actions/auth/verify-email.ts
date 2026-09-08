"use server";

import { prisma } from "@/lib/db/prisma";

export interface VerifyEmailResponse {
  success: boolean;
  error?: string;
  message?: string;
}

export async function verifyEmailAction(token: string): Promise<VerifyEmailResponse> {
  if (!token || typeof token !== "string") {
    return { success: false, error: "Verification token is required." };
  }

  try {
    const record = await prisma.verificationToken.findUnique({
      where: { token },
    });

    if (!record || record.type !== "email_verification") {
      return { success: false, error: "Invalid or expired verification link." };
    }

    if (new Date() > record.expiresAt) {
      // Token expired, cleanup
      await prisma.verificationToken.delete({
        where: { id: record.id },
      });
      return {
        success: false,
        error: "Verification link has expired. Please sign up again or request a new link.",
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

    // Delete used token
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
