import React from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/auth";
import { getScopedPrisma } from "@/lib/db/prisma";
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

  const db = getScopedPrisma(session.user.id);
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  // Fetch metrics and dashboard data
  const [
    allProjects,
    pendingPayments,
    recentProjects,
    timeEntries,
    activeClientsCount,
  ] = await Promise.all([
    db.project.findMany({
      select: {
        id: true,
        status: true,
      },
    }),
    db.payment.findMany({
      where: { status: "PENDING" },
      orderBy: { dueDate: "asc" },
      include: {
        project: {
          select: {
            id: true,
            title: true,
          },
        },
      },
    }),
    db.project.findMany({
      where: {
        updatedAt: {
          gte: sevenDaysAgo,
        },
      },
      orderBy: { updatedAt: "desc" },
      take: 10,
      include: {
        client: {
          select: {
            id: true,
            name: true,
            archivedAt: true,
          },
        },
      },
    }),
    db.timeEntry.findMany({
      select: {
        minutes: true,
      },
    }),
    db.client.count({
      where: { archivedAt: null },
    }),
  ]);

  // Counts by status
  const notStartedCount = allProjects.filter(p => p.status === "NOT_STARTED").length;
  const inProgressCount = allProjects.filter(p => p.status === "IN_PROGRESS").length;
  const doneCount = allProjects.filter(p => p.status === "DONE").length;
  const archivedCount = allProjects.filter(p => p.status === "ARCHIVED").length;
  const activeProjectsCount = notStartedCount + inProgressCount;
  const totalProjectsCount = allProjects.length;

  // Pending payments sum
  const outstandingTotal = pendingPayments.reduce((acc, p) => acc + Number(p.amount), 0);

  // Total logged hours
  const totalMinutes = timeEntries.reduce((acc, t) => acc + t.minutes, 0);
  const totalHoursFormatted = (totalMinutes / 60).toFixed(1);

  const formatStatus = (s: string) => {
    switch (s) {
      case "NOT_STARTED":
        return "Not Started";
      case "IN_PROGRESS":
        return "In Progress";
      case "DONE":
        return "Done";
      case "ARCHIVED":
        return "Archived";
      default:
        return s;
    }
  };

  const getStatusBadgeClass = (s: string) => {
    switch (s) {
      case "NOT_STARTED":
        return "fh-badge--neutral";
      case "IN_PROGRESS":
        return "fh-badge--primary";
      case "DONE":
        return "fh-badge--success";
      case "ARCHIVED":
        return "fh-badge--warning";
      default:
        return "fh-badge--neutral";
    }
  };

  return (
    <div className="fh-dashboard-content">
      {/* Welcome Header */}
      <div className="fh-page-header">
        <div>
          <h1 className="fh-page-title">Dashboard</h1>
          <p className="fh-page-subtitle">
            Welcome back, <strong>{session.user.email}</strong>. Here is an overview of your freelance workspace.
          </p>
        </div>
        <div className="fh-page-actions">
          <Link href="/projects" className="fh-button fh-button--primary">
            + New Project
          </Link>
        </div>
      </div>

      {/* DASH-02: Empty State when 0 projects exist */}
      {totalProjectsCount === 0 ? (
        <div className="fh-onboarding-card">
          <h2 className="fh-onboarding-title">Welcome to Freelancer Hub!</h2>
          <p className="fh-onboarding-desc">
            You don&apos;t have any projects yet. Create your first project to start tracking time, managing clients, and recording payments.
          </p>
          <Link href="/projects" className="fh-button fh-button--primary" style={{ padding: "12px 28px", fontSize: "1rem" }}>
            Create your first project
          </Link>
        </div>
      ) : (
        <>
          {/* DASH-01: Summary Metric Cards */}
          <div className="fh-dashboard-metrics-grid">
            <div className="fh-metric-card fh-metric-card--highlight">
              <span className="fh-metric-card-label">Active Projects</span>
              <span className="fh-metric-card-value">{activeProjectsCount}</span>
              <span className="fh-metric-card-sub">
                {inProgressCount} in progress · {notStartedCount} not started
              </span>
            </div>

            <div className="fh-metric-card">
              <span className="fh-metric-card-label">Outstanding Payments</span>
              <span className="fh-metric-card-value">
                ${outstandingTotal.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
              <span className="fh-metric-card-sub">
                {pendingPayments.length} pending {pendingPayments.length === 1 ? "payment" : "payments"}
              </span>
            </div>

            <div className="fh-metric-card">
              <span className="fh-metric-card-label">Total Time Tracked</span>
              <span className="fh-metric-card-value">{totalHoursFormatted} hrs</span>
              <span className="fh-metric-card-sub">
                {Math.floor(totalMinutes / 60)}h {totalMinutes % 60}m across all projects
              </span>
            </div>

            <div className="fh-metric-card">
              <span className="fh-metric-card-label">Active Clients</span>
              <span className="fh-metric-card-value">{activeClientsCount}</span>
              <span className="fh-metric-card-sub">
                {doneCount} completed · {archivedCount} archived projects
              </span>
            </div>
          </div>

          {/* DASH-01: Split Content Grid */}
          <div className="fh-dashboard-sections-grid">
            {/* Recent Projects (Updated in last 7 days) */}
            <div className="fh-dashboard-section-card">
              <div className="fh-dashboard-section-header">
                <h2 className="fh-dashboard-section-title">Recently Active Projects</h2>
                <Link href="/projects" className="fh-dashboard-section-link">
                  View all ({totalProjectsCount}) →
                </Link>
              </div>

              {recentProjects.length === 0 ? (
                <div className="fh-empty-state" style={{ padding: "var(--spacing-large-spacing)" }}>
                  <p className="fh-empty-text">No projects updated in the last 7 days.</p>
                </div>
              ) : (
                <div className="fh-dashboard-list">
                  {recentProjects.map(project => (
                    <Link
                      key={project.id}
                      href={`/projects/${project.id}`}
                      className="fh-dashboard-item"
                    >
                      <div className="fh-dashboard-item-main">
                        <span className="fh-dashboard-item-title">{project.title}</span>
                        <div className="fh-dashboard-item-meta">
                          {project.client ? (
                            <span>
                              {project.client.name}
                              {project.client.archivedAt && (
                                <span className="fh-client-archived-tag" style={{ marginLeft: "6px" }}>
                                  Client archived
                                </span>
                              )}
                            </span>
                          ) : (
                            <span>No client</span>
                          )}
                          <span>·</span>
                          <span>Updated {new Date(project.updatedAt).toLocaleDateString()}</span>
                        </div>
                      </div>
                      <div className="fh-dashboard-item-right">
                        <span className={`fh-badge ${getStatusBadgeClass(project.status)}`}>
                          {formatStatus(project.status)}
                        </span>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>

            {/* Pending Payments Ledger */}
            <div className="fh-dashboard-section-card">
              <div className="fh-dashboard-section-header">
                <h2 className="fh-dashboard-section-title">Pending Payments</h2>
                <span className="fh-dashboard-section-link" style={{ cursor: "default", textDecoration: "none" }}>
                  {pendingPayments.length} pending
                </span>
              </div>

              {pendingPayments.length === 0 ? (
                <div className="fh-empty-state" style={{ padding: "var(--spacing-large-spacing)" }}>
                  <p className="fh-empty-text">All payments are up to date! No pending invoices.</p>
                </div>
              ) : (
                <div className="fh-dashboard-list">
                  {pendingPayments.slice(0, 10).map(payment => (
                    <Link
                      key={payment.id}
                      href={`/projects/${payment.projectId}`}
                      className="fh-dashboard-item"
                    >
                      <div className="fh-dashboard-item-main">
                        <span className="fh-dashboard-item-title">{payment.project.title}</span>
                        <div className="fh-dashboard-item-meta">
                          <span>Due: {new Date(payment.dueDate).toLocaleDateString()}</span>
                        </div>
                      </div>
                      <div className="fh-dashboard-item-right">
                        <span className="fh-table-amount" style={{ fontWeight: 600 }}>
                          ${Number(payment.amount).toFixed(2)}
                        </span>
                        <span className="fh-badge fh-badge--warning">
                          PENDING
                        </span>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* Account Settings & Security footer */}
      <div className="fh-dashboard-account-section">
        <div className="fh-dashboard-account-info">
          <span style={{ font: "var(--typography-label-medium)", fontWeight: 600, color: "var(--color-on-surface)" }}>
            Account & Security
          </span>
          <span style={{ font: "var(--typography-body-small)", color: "var(--color-on-surface-varaint)" }}>
            Logged in as {session.user.email}
          </span>
        </div>
        <div className="fh-dashboard-actions">
          <SignOutButton />
          <DeactivateAccountModal />
        </div>
      </div>
    </div>
  );
}
