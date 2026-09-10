"use client";

import React, { useTransition } from "react";
import { Button } from "@/components/ui/Button";
import { signOutAction } from "@/server/actions/auth/signout";

export function SignOutButton() {
  const [isPending, startTransition] = useTransition();

  return (
    <Button
      variant="primary"
      onClick={() => startTransition(() => signOutAction())}
      isLoading={isPending}
      className="fh-signout-button"
    >
      Sign out
    </Button>
  );
}