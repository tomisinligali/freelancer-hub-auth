import React from "react";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/auth";
import { prisma } from "@/lib/db/prisma";
import { SignOutButton } from "@/components/dashboard/SignOutButton";
import { DeactivateAccountModal } from "@/components/dashboard/DeactivateAccountModal";

export const metadata = {
  title: "Dashboard | Freelancer Hub",
};

export default async function DashboardPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/auth?view=signin");
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      fullName: true,
      firstName: true,
      lastName: true,
      email: true,
    },
  });

  const name =
    user?.fullName ||
    [user?.firstName, user?.lastName].filter(Boolean).join(" ") ||
    user?.email ||
    session.user.email ||
    "there";

  return (
    <div className="fh-dashboard-content fh-dashboard-content--centered">
      <div className="fh-dashboard-welcome-card">
        <div className="fh-auth-title-group">
          <h1 className="fh-auth-title">You Are Signed In</h1>
        </div>
        <p className="fh-dashboard-greeting">Welcome, {name}</p>
        <div className="fh-dashboard-actions">
          <SignOutButton />
        </div>
        <div className="fh-dashboard-account-actions">
          <DeactivateAccountModal />
        </div>
      </div>
    </div>
  );
}