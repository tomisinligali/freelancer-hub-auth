"use server";

import crypto from "crypto";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db/prisma";
import { splitFullName, validateSignupInput } from "@/lib/validation/auth";
import { enqueueVerificationEmail } from "@/lib/background/email-jobs";

export interface ActionResponse {
  success: boolean;
  error?: string;
  message?: string;
  verificationToken?: string; // provided for development/testing ease
}

export async function signupAction(formData: FormData): Promise<ActionResponse> {
  const validation = validateSignupInput(formData);
  if (!validation.success || !validation.data) {
    return { success: false, error: validation.error || "Invalid input." };
  }

  const { fullName, email, password } = validation.data;

  try {
    const existing = await prisma.user.findUnique({
      where: { email },
    });

    if (existing) {
      // Don't leak detail or block - standard message
      return {
        success: false,
        error: "An account with this email already exists.",
      };
    }

    // Security Rule 3 & Skill: Hash with bcrypt cost 12
    const passwordHash = await bcrypt.hash(password, 12);

    const nameParts = splitFullName(fullName);

    const user = await prisma.user.create({
      data: {
        email,
        fullName: nameParts.fullName,
        firstName: nameParts.firstName,
        middleName: nameParts.middleName,
        lastName: nameParts.lastName,
        passwordHash,
        emailVerified: null,
      },
    });

    // Create email verification code (crypto.randomBytes(32) -> 64-char hex)
    const verificationCode = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    await prisma.verificationToken.create({
      data: {
        identifier: user.email,
        token: verificationCode,
        type: "email_verification",
        expiresAt,
      },
    });

    // Background job: email the one-time verification code to the user
    enqueueVerificationEmail(user.email, verificationCode);

    return {
      success: true,
      message: "Account created successfully. Enter the verification code sent to your email.",
      verificationToken: verificationCode,
    };
  } catch (err: unknown) {
    console.error("Signup error:", err);
    return {
      success: false,
      error: "An unexpected error occurred while creating your account. Please try again.",
    };
  }
}
