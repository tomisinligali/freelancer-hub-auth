import { prisma } from "@/lib/db/prisma";

export interface CleanupResult {
  deletedCount: number;
  cutoffDate: Date;
  success: boolean;
  error?: string;
}

/**
 * Hard deletes user accounts that have been deactivated for more than 30 days.
 * Cascades to all owned Clients, Projects, TimeEntries, and Payments.
 */
export async function cleanupDeactivatedUsersJob(): Promise<CleanupResult> {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  try {
    const result = await prisma.user.deleteMany({
      where: {
        deactivatedAt: {
          not: null,
          lte: thirtyDaysAgo,
        },
      },
    });

    console.log(`[Scheduled Job] Purged ${result.count} deactivated user accounts past the 30-day grace period.`);

    return {
      success: true,
      deletedCount: result.count,
      cutoffDate: thirtyDaysAgo,
    };
  } catch (err: unknown) {
    console.error("[Scheduled Job Error] Failed to purge deactivated users:", err);
    return {
      success: false,
      deletedCount: 0,
      cutoffDate: thirtyDaysAgo,
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }
}
