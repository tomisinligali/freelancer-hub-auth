"use client";

import React, { useState, useTransition } from "react";
import { signOut } from "next-auth/react";
import { deactivateAccountAction } from "@/server/actions/auth/deactivate-account";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { FormMessage } from "@/components/ui/FormMessage";

export function DeactivateAccountModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [confirmationInput, setConfirmationInput] = useState("");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const handleOpen = () => {
    setIsOpen(true);
    setConfirmationInput("");
    setError(null);
  };

  const handleClose = () => {
    if (!isPending) {
      setIsOpen(false);
      setConfirmationInput("");
      setError(null);
    }
  };

  const handleDeactivate = (e: React.FormEvent) => {
    e.preventDefault();
    if (confirmationInput !== "DELETE") {
      setError("You must type DELETE in capital letters to confirm.");
      return;
    }

    startTransition(async () => {
      const res = await deactivateAccountAction(confirmationInput);
      if (!res.success) {
        setError(res.error || "Failed to deactivate account.");
      } else {
        // Sign out immediately upon deactivation
        await signOut({ callbackUrl: "/auth?view=signin" });
      }
    });
  };

  return (
    <>
      <button
        type="button"
        onClick={handleOpen}
        className="fh-btn-danger-outline"
      >
        Delete account
      </button>

      {isOpen ? (
        <div className="fh-modal-backdrop" onClick={handleClose}>
          <div
            className="fh-modal-card"
            onClick={e => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="deactivate-modal-title"
          >
            <h2 id="deactivate-modal-title" className="fh-modal-title">
              Delete Account
            </h2>
            <p className="fh-modal-description">
              Deactivating your account will immediately log you out. Your data will be kept intact for a <strong>30-day grace period</strong>, during which you can reactivate your account at any time. After 30 days, your account and all associated clients, projects, time entries, and payments will be permanently deleted.
            </p>

            <FormMessage type="error" message={error} />

            <form onSubmit={handleDeactivate} className="fh-modal-form">
              <Input
                label="Type DELETE to confirm:"
                value={confirmationInput}
                onChange={e => setConfirmationInput(e.target.value)}
                placeholder="DELETE"
                autoFocus
                disabled={isPending}
              />

              <div className="fh-modal-actions">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={handleClose}
                  disabled={isPending}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  isLoading={isPending}
                  disabled={confirmationInput !== "DELETE" || isPending}
                  className="fh-button--danger"
                >
                  Confirm Delete
                </Button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}
