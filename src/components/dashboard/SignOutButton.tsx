"use client";

import React, { useTransition } from "react";
import { signOut } from "next-auth/react";
import { Button } from "@/components/ui/Button";

export function SignOutButton() {
  const [isPending, startTransition] = useTransition();

  const handleSignOut = () => {
    startTransition(async () => {
      await signOut({ callbackUrl: "/auth" });
    });
  };

  return (
    <Button
      variant="secondary"
      onClick={handleSignOut}
      isLoading={isPending}
      className="fh-signout-button"
    >
      Sign out
    </Button>
  );
}
