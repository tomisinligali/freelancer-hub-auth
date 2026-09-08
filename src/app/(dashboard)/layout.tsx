import React from "react";
import { auth } from "@/lib/auth/auth";
import { redirect } from "next/navigation";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session?.user) {
    redirect("/auth");
  }

  return (
    <div className="fh-dashboard-shell">
      <header className="fh-dashboard-header">
        <div className="fh-dashboard-header-inner">
          <span className="fh-dashboard-logo">Freelancer Hub</span>
          <div className="fh-dashboard-user-info">
            <span className="fh-dashboard-user-email">{session.user.email}</span>
          </div>
        </div>
      </header>
      <main className="fh-dashboard-main">{children}</main>
    </div>
  );
}
