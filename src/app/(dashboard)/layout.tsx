import React from "react";
import Link from "next/link";
import { auth } from "@/lib/auth/auth";
import { redirect } from "next/navigation";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session?.user) {
    redirect("/auth?view=signin");
  }

  return (
    <div className="fh-dashboard-shell">
      <header className="fh-dashboard-header">
        <div className="fh-dashboard-header-inner">
          <Link href="/dashboard" className="fh-dashboard-logo">
            Freelancer Hub
          </Link>
          <div className="fh-dashboard-user-info">
            <span className="fh-dashboard-user-email">{session.user.email}</span>
          </div>
        </div>
      </header>
      <main className="fh-dashboard-main">{children}</main>
    </div>
  );
}
