"use server";

import crypto from "crypto";
import bcrypt from "bcryptjs";
import { headers } from "next/headers";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import {
  splitFullName,
  validateSignupInput,
  idempotencyKeySchema,
} from "@/lib/validation/auth";
import { enqueueVerificationEmail } from "@/lib/background/email-jobs";
import {
  getClientIp,
  isLoginLocked,
  recordLoginFailure,
  clearLoginFailures,
  lockedMessage,
} from "@/lib/auth/rate-limit";

export interface ActionResponse {
  success: boolean;
  error?: string;
  message?: string;
}

const SUCCESS_MESSAGE =
  "Account created successfully. Enter the verification code sent to your email.";

function classifyUniqueViolation(
  err: unknown
): { isUnique: true; targets: string[] } | { isUnique: false } {
  if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
    const raw = err.meta?.target;
    return {
      isUnique: true,
      targets: Array.isArray(raw) ? raw.map(String) : [],
    };
  }
  return { isUnique: false };
}

function mentionsConstraint(targets: string[], name: string): boolean {
  // PostgreSQL reports the constraint name ("User_email_key"), while MySQL/SQLite
  // report the field name ("email"). Match either so the friendly error fires.
  return targets.some(t => t.toLowerCase().includes(name.toLowerCase()));
}

function generateVerificationCode(): string {
  const raw = crypto.randomBytes(32);
  return (raw.readUInt32BE(0) % 1000000).toString().padStart(6, "0");
}

export async function signupAction(formData: FormData): Promise<ActionResponse> {
  const headerList = await headers();
  const ip = getClientIp(headerList);

  // User-entered fields
  const validation = validateSignupInput(formData);
  if (!validation.success || !validation.data) {
    return { success: false, error: validation.error || "Invalid input." };
  }

  // Idempotency key (separate from user fields; validated server-side only)
  const keyParsed = idempotencyKeySchema.safeParse(formData.get("idempotencyKey"));
  if (!keyParsed.success) {
    return { success: false, error: keyParsed.error.issues[0]?.message || "Invalid idempotency key." };
  }
  const idempotencyKey = keyParsed.data;
  const { fullName, email, password } = validation.data;

  const lockedMinutes = await isLoginLocked(email, ip);
  if (lockedMinutes > 0) {
    return { success: false, error: lockedMessage(lockedMinutes) };
  }

  try {
    // Idempotent replay: the same request key already produced an account -> no-op
    const existingRequest = await prisma.accountRequest.findUnique({
      where: { idempotencyKey },
    });

    if (existingRequest) {
      if (existingRequest.status === "COMPLETED") {
        const user = await prisma.user.findUnique({
          where: { email: existingRequest.email },
        });
        return user
          ? { success: true, message: SUCCESS_MESSAGE }
          : { success: false, error: "This signup request was already processed." };
      }
      // Concurrent request still in flight
      return {
        success: false,
        error: "This signup request is already being processed. Please wait.",
      };
    }

    // Deterministic, expensive work happens before the short critical section
    const passwordHash = await bcrypt.hash(password, 12);
    const nameParts = splitFullName(fullName);
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    let user: { id: string; email: string } | null = null;
    let confirmationCode = "";

    for (let attempt = 0; attempt < 3; attempt++) {
      const verificationCode = generateVerificationCode();
      confirmationCode = verificationCode;

      try {
        user = await prisma.$transaction(async tx => {
          const created = await tx.user.create({
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

          await tx.verificationToken.create({
            data: {
              identifier: email,
              token: verificationCode,
              type: "email_verification",
              expiresAt,
            },
          });

          await tx.accountRequest.create({
            data: {
              idempotencyKey,
              email,
              status: "COMPLETED",
              completedAt: new Date(),
            },
          });

          return { id: created.id, email: created.email };
        });
        break;
      } catch (err: unknown) {
        const violation = classifyUniqueViolation(err);
        if (!violation.isUnique) throw err;

        if (mentionsConstraint(violation.targets, "idempotencyKey")) {
          // Lost the idempotency race: mirror the winner's outcome, don't re-enqueue
          const winner = await prisma.accountRequest.findUnique({
            where: { idempotencyKey },
          });
          if (winner?.status === "COMPLETED") {
            return { success: true, message: SUCCESS_MESSAGE };
          }
          return {
            success: false,
            error: "An account with this email already exists.",
          };
        }

        if (mentionsConstraint(violation.targets, "email")) {
          await recordLoginFailure(email, ip);
          return {
            success: false,
            error: "An account with this email already exists.",
          };
        }

        if (mentionsConstraint(violation.targets, "token")) {
          continue; // astronomically rare code collision — regenerate
        }

        throw err;
      }
    }

    if (!user) {
      await recordLoginFailure(email, ip);
      return {
        success: false,
        error: "An unexpected error occurred while creating your account. Please try again.",
      };
    }

    // Background job: email the one-time verification code (fired exactly once)
    enqueueVerificationEmail(email, confirmationCode);

    await clearLoginFailures(email, ip);

    return { success: true, message: SUCCESS_MESSAGE };
  } catch (err: unknown) {
    console.error("Signup error:", err);
    await recordLoginFailure(email, ip);
    return {
      success: false,
      error: "An unexpected error occurred while creating your account. Please try again.",
    };
  }
}