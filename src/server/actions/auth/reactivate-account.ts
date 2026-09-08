"use server";

import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db/prisma";
import { validateLoginInput } from "@/lib/validation/auth";

export interface ReactivateAccountResponse {
  success: boolean;
  error?: string;
  message?: string;
}

export async function reactivateAccountAction(formData: FormData): Promise<ReactivateAccountResponse> {
  const validation = validateLoginInput(formData);
  if (!validation.success || !validation.data) {
    return { success: false, error: validation.error || "Valid email and password are required." };
  }

  const { email, password } = validation.data;

  try {
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user || !user.passwordHash) {
      return {
        success: false,
        error: "Invalid email or password.",
      };
    }

    const isValidPassword = await bcrypt.compare(password, user.passwordHash);
    if (!isValidPassword) {
      return {
        success: false,
        error: "Invalid email or password.",
      };
    }

    if (!user.deactivatedAt) {
      return {
        success: false,
        error: "This account is already active.",
      };
    }

    // Check 30-day grace period
    const gracePeriodMs = 30 * 24 * 60 * 60 * 1000;
    const timeSinceDeactivation = Date.now() - new Date(user.deactivatedAt).getTime();

    if (timeSinceDeactivation > gracePeriodMs) {
      return {
        success: false,
        error: "The 30-day grace period has expired. This account is scheduled for permanent deletion.",
      };
    }

    // Reactivate account
    await prisma.user.update({
      where: { id: user.id },
      data: {
        deactivatedAt: null,
      },
    });

    return {
      success: true,
      message: "Your account has been reactivated successfully. You can now sign in.",
    };
  } catch (err: unknown) {
    console.error("Account reactivation error:", err);
    return {
      success: false,
      error: "An unexpected error occurred while reactivating your account.",
    };
  }
}
