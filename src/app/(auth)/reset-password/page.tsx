"use client";

import React, { useState, useTransition, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { resetPasswordAction } from "@/server/actions/auth/reset-password";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { FormMessage } from "@/components/ui/FormMessage";

function ResetPasswordContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";

  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(
    !token ? "Missing or invalid password reset token." : null
  );
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    const form = e.currentTarget;
    const formData = new FormData(form);
    const password = formData.get("password") as string;
    const confirmPassword = formData.get("confirmPassword") as string;

    if (!password || password.length < 8) {
      setError("Password must be at least 8 characters long.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    startTransition(async () => {
      const res = await resetPasswordAction(formData);
      if (!res.success) {
        setError(res.error || "Failed to reset password.");
      } else {
        setSuccessMessage(res.message || "Password reset successfully!");
      }
    });
  };

  return (
    <div className="fh-auth-content">
      <div className="fh-auth-title-group">
        <h1 className="fh-auth-title">Set new password</h1>
        <p className="fh-auth-subtitle">Choose a new password for your account</p>
      </div>

      <FormMessage type="error" message={error} />
      <FormMessage type="success" message={successMessage} />

      {!successMessage && token ? (
        <form onSubmit={handleSubmit} className="fh-auth-form" noValidate>
          <input type="hidden" name="token" value={token} />

          <Input
            label="New password"
            name="password"
            type="password"
            required
            autoComplete="new-password"
            placeholder="At least 8 characters"
            helperText="Must be at least 8 characters"
          />

          <Input
            label="Confirm new password"
            name="confirmPassword"
            type="password"
            required
            autoComplete="new-password"
            placeholder="Re-enter password"
          />

          <Button type="submit" isLoading={isPending} className="fh-auth-submit">
            Reset password
          </Button>
        </form>
      ) : null}

      <footer className="fh-auth-footer">
        <p className="fh-auth-footer-text">
          <Link href="/signin" className="fh-auth-link">
            Back to sign in
          </Link>
        </p>
      </footer>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="fh-auth-content"><p className="fh-auth-subtitle">Loading...</p></div>}>
      <ResetPasswordContent />
    </Suspense>
  );
}
