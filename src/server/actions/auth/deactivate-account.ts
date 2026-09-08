"use server";

import { auth } from "@/lib/auth/auth";
import { prisma } from "@/lib/db/prisma";

export interface DeactivateAccountResponse {
  success: boolean;
  error?: string;
  message?: string;
}

export async function deactivateAccountAction(confirmation: string): Promise<DeactivateAccountResponse> {
  const session = await auth();

  if (!session?.user?.id) {
    return {
      success: false,
      error: "You must be signed in to deactivate your account.",
    };
  }

  // Security Rule 23 & Skill: Require exact typed confirmation "DELETE"
  if (confirmation !== "DELETE") {
    return {
      success: false,
      error: "Please type DELETE in all caps to confirm account deactivation.",
    };
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
    });

    if (!user) {
      return {
        success: false,
        error: "User account not found.",
      };
    }

    // Set deactivatedAt to start 30-day grace period
    await prisma.user.update({
      where: { id: session.user.id },
      data: {
        deactivatedAt: new Date(),
      },
    });

    return {
      success: true,
      message: "Your account has been deactivated. You have a 30-day grace period to reactivate it.",
    };
  } catch (err: unknown) {
    console.error("Account deactivation error:", err);
    return {
      success: false,
      error: "An unexpected error occurred while deactivating your account.",
    };
  }
}
