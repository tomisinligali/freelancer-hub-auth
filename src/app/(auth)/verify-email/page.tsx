"use client";

import React, { useState, useEffect, useTransition, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { verifyEmailAction } from "@/server/actions/auth/verify-email";
import { Button } from "@/components/ui/Button";
import { FormMessage } from "@/components/ui/FormMessage";

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";

  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [hasTriggered, setHasTriggered] = useState(false);

  useEffect(() => {
    if (token && !hasTriggered) {
      setHasTriggered(true);
      startTransition(async () => {
        const res = await verifyEmailAction(token);
        if (!res.success) {
          setError(res.error || "Verification failed.");
        } else {
          setSuccessMessage(res.message || "Email verified successfully!");
        }
      });
    }
  }, [token, hasTriggered]);

  const handleManualVerify = () => {
    if (!token) {
      setError("No verification token provided in the link.");
      return;
    }
    setError(null);
    startTransition(async () => {
      const res = await verifyEmailAction(token);
      if (!res.success) {
        setError(res.error || "Verification failed.");
      } else {
        setSuccessMessage(res.message || "Email verified successfully!");
      }
    });
  };

  return (
    <div className="fh-auth-content">
      <div className="fh-auth-title-group">
        <h1 className="fh-auth-title">Email Verification</h1>
        <p className="fh-auth-subtitle">
          {isPending
            ? "Verifying your email address..."
            : successMessage
            ? "Your email is confirmed!"
            : error
            ? "Verification issue"
            : "Confirm your email to complete registration"}
        </p>
      </div>

      <FormMessage type="error" message={error} />
      <FormMessage type="success" message={successMessage} />

      {!token && !successMessage && !error ? (
        <p className="fh-auth-subtitle">
          Please check your email inbox for the verification link.
        </p>
      ) : null}

      {!successMessage && token && error ? (
        <Button onClick={handleManualVerify} isLoading={isPending} className="fh-auth-submit">
          Try again
        </Button>
      ) : null}

      <footer className="fh-auth-footer">
        <p className="fh-auth-footer-text">
          <Link href="/signin" className="fh-auth-link">
            Proceed to sign in
          </Link>
        </p>
      </footer>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<div className="fh-auth-content"><p className="fh-auth-subtitle">Loading...</p></div>}>
      <VerifyEmailContent />
    </Suspense>
  );
}
