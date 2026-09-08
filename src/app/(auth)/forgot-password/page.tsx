"use client";

import React, { useState, useTransition } from "react";
import Link from "next/link";
import { forgotPasswordAction } from "@/server/actions/auth/forgot-password";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { FormMessage } from "@/components/ui/FormMessage";

export default function ForgotPasswordPage() {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [devResetToken, setDevResetToken] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);
    setDevResetToken(null);

    const form = e.currentTarget;
    const formData = new FormData(form);

    startTransition(async () => {
      const res = await forgotPasswordAction(formData);
      if (!res.success) {
        setError(res.error || "Failed to process request.");
      } else {
        setSuccessMessage(res.message || "Reset link generated.");
        if (res.resetToken) {
          setDevResetToken(res.resetToken);
        }
      }
    });
  };

  return (
    <div className="fh-auth-content">
      <div className="fh-auth-title-group">
        <h1 className="fh-auth-title">Reset password</h1>
        <p className="fh-auth-subtitle">
          Enter your email address and we&apos;ll send you a link to reset your password.
        </p>
      </div>

      <FormMessage type="error" message={error} />
      <FormMessage type="success" message={successMessage} />

      {devResetToken ? (
        <div className="fh-dev-box">
          <p className="fh-dev-box-title">Reset Link (Development):</p>
          <Link
            href={`/reset-password?token=${devResetToken}`}
            className="fh-dev-box-link"
          >
            Click here to reset password
          </Link>
        </div>
      ) : null}

      {!successMessage ? (
        <form onSubmit={handleSubmit} className="fh-auth-form" noValidate>
          <Input
            label="Email address"
            name="email"
            type="email"
            required
            autoComplete="email"
            placeholder="you@example.com"
          />

          <Button type="submit" isLoading={isPending} className="fh-auth-submit">
            Send reset link
          </Button>
        </form>
      ) : null}

      <footer className="fh-auth-footer">
        <p className="fh-auth-footer-text">
          Remember your password?{" "}
          <Link href="/signin" className="fh-auth-link">
            Back to sign in
          </Link>
        </p>
      </footer>
    </div>
  );
}
