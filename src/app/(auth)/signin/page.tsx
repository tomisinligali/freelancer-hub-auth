"use client";

import React, { useState, useTransition, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { FormMessage } from "@/components/ui/FormMessage";

function SignInContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const callbackUrl = searchParams.get("callbackUrl") || "/dashboard";

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    const form = e.currentTarget;
    const formData = new FormData(form);
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;

    if (!email || !password) {
      setError("Please provide both email and password.");
      return;
    }

    startTransition(async () => {
      try {
        const result = await signIn("credentials", {
          email,
          password,
          redirect: false,
        });

        if (result?.error) {
          setError(result.error);
        } else {
          router.push(callbackUrl);
          router.refresh();
        }
      } catch (err: unknown) {
        console.error("Sign in error:", err);
        setError("Failed to sign in. Please check your credentials.");
      }
    });
  };

  return (
    <div className="fh-auth-content">
      <div className="fh-auth-title-group">
        <h1 className="fh-auth-title">Welcome back</h1>
        <p className="fh-auth-subtitle">Sign in to your Freelancer Hub account</p>
      </div>

      <FormMessage type="error" message={error} />

      <form onSubmit={handleSubmit} className="fh-auth-form" noValidate>
        <Input
          label="Email address"
          name="email"
          type="email"
          required
          autoComplete="email"
          placeholder="you@example.com"
        />

        <div className="fh-password-field-wrapper">
          <Input
            label="Password"
            name="password"
            type="password"
            required
            autoComplete="current-password"
            placeholder="Your password"
          />
          <div className="fh-forgot-password-link-wrapper">
            <Link href="/forgot-password" className="fh-auth-link fh-auth-link--small">
              Forgot password?
            </Link>
          </div>
        </div>

        <Button type="submit" isLoading={isPending} className="fh-auth-submit">
          Sign in
        </Button>
      </form>

      <footer className="fh-auth-footer">
        <p className="fh-auth-footer-text">
          Don&apos;t have an account?{" "}
          <Link href="/signup" className="fh-auth-link">
            Create an account
          </Link>
        </p>
      </footer>
    </div>
  );
}

export default function SignInPage() {
  return (
    <Suspense fallback={<div className="fh-auth-content"><p className="fh-auth-subtitle">Loading...</p></div>}>
      <SignInContent />
    </Suspense>
  );
}
