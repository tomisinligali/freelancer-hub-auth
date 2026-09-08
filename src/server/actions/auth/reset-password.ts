"use server";

import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db/prisma";
import { validateResetPasswordInput } from "@/lib/validation/auth";

export interface ResetPasswordResponse {
  success: boolean;
  error?: string;
  message?: string;
}

export async function resetPasswordAction(formData: FormData): Promise<ResetPasswordResponse> {
  const validation = validateResetPasswordInput(formData);
  if (!validation.success || !validation.data) {
    return { success: false, error: validation.error || "Invalid input." };
  }

  const { token, password } = validation.data;

  try {
    const record = await prisma.verificationToken.findUnique({
      where: { token },
    });

    if (!record || record.type !== "password_reset") {
      return { success: false, error: "Invalid or expired password reset link." };
    }

    if (new Date() > record.expiresAt) {
      await prisma.verificationToken.delete({
        where: { id: record.id },
      });
      return {
        success: false,
        error: "Password reset link has expired. Please request a new one.",
      };
    }

    const user = await prisma.user.findUnique({
      where: { email: record.identifier },
    });

    if (!user) {
      return { success: false, error: "User account not found." };
    }

    // Hash new password with bcrypt cost 12
    const passwordHash = await bcrypt.hash(password, 12);

    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash },
    });

    // Delete used token
    await prisma.verificationToken.delete({
      where: { id: record.id },
    });

    return {
      success: true,
      message: "Password reset successfully. You can now sign in with your new password.",
    };
  } catch (err: unknown) {
    console.error("Reset password error:", err);
    return {
      success: false,
      error: "An unexpected error occurred while resetting your password. Please try again.",
    };
  }
}
