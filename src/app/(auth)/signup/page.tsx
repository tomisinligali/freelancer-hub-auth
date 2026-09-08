"use client";

import React, { useState, useTransition } from "react";
import Link from "next/link";
import { signupAction } from "@/server/actions/auth/signup";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { FormMessage } from "@/components/ui/FormMessage";

export default function SignupPage() {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [devVerificationToken, setDevVerificationToken] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);
    setDevVerificationToken(null);

    const form = e.currentTarget;
    const formData = new FormData(form);
    const password = formData.get("password") as string;

    if (password && password.length < 8) {
      setError("Password must be at least 8 characters long.");
      return;
    }

    startTransition(async () => {
      const res = await signupAction(formData);
      if (!res.success) {
        setError(res.error || "Failed to create account.");
      } else {
        setSuccessMessage(res.message || "Account created! Please verify your email.");
        if (res.verificationToken) {
          setDevVerificationToken(res.verificationToken);
        }
        form.reset();
      }
    });
  };

  return (
    <div className="fh-auth-content">
      <div className="fh-auth-title-group">
        <h1 className="fh-auth-title">Create your account</h1>
        <p className="fh-auth-subtitle">Start tracking your freelance projects and payments</p>
      </div>

      <FormMessage type="error" message={error} />
      <FormMessage type="success" message={successMessage} />

      {devVerificationToken ? (
        <div className="fh-dev-box">
          <p className="fh-dev-box-title">Verification Link (Development):</p>
          <Link
            href={`/verify-email?token=${devVerificationToken}`}
            className="fh-dev-box-link"
          >
            Click here to verify email
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

          <Input
            label="Password"
            name="password"
            type="password"
            required
            autoComplete="new-password"
            placeholder="At least 8 characters"
            helperText="Must be at least 8 characters"
          />

          <Button type="submit" isLoading={isPending} className="fh-auth-submit">
            Create account
          </Button>
        </form>
      ) : null}

      <footer className="fh-auth-footer">
        <p className="fh-auth-footer-text">
          Already have an account?{" "}
          <Link href="/signin" className="fh-auth-link">
            Sign in
          </Link>
        </p>
      </footer>
    </div>
  );
}
