import React from "react";
import { auth } from "@/lib/auth/auth";
import { SignOutButton } from "@/components/dashboard/SignOutButton";

export default async function DashboardPage() {
  const session = await auth();

  return (
    <div className="fh-dashboard-content">
      <div className="fh-dashboard-welcome-card">
        <h1 className="fh-dashboard-title">Dashboard</h1>
        <p className="fh-dashboard-greeting">
          Welcome back, <strong>{session?.user?.email}</strong>
        </p>
        <p className="fh-dashboard-subtitle">
          Authentication and account slice initialized. Project tracker modules will appear here.
        </p>

        <div className="fh-dashboard-actions">
          <SignOutButton />
        </div>
      </div>
    </div>
  );
}
