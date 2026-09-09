import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

declare global {
  var prismaGlobal: PrismaClient | undefined;
  var pgPoolGlobal: pg.Pool | undefined;
}

function createPgPool(): pg.Pool {
  return new pg.Pool({
    connectionString: process.env.DATABASE_URL,
    max: 10, // pool size per server instance
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 5_000,
  });
}

/**
 * Shared pg Pool: one per server instance, capped at 10 concurrent connections.
 */
export const pgPool = globalThis.pgPoolGlobal ?? createPgPool();

const prismaAdapter = new PrismaPg(pgPool);

export const prisma = globalThis.prismaGlobal ?? new PrismaClient({ adapter: prismaAdapter });

if (process.env.NODE_ENV !== "production") {
  globalThis.prismaGlobal = prisma;
  globalThis.pgPoolGlobal = pgPool;
}

/**
 * Creates or returns a scoped Prisma Client that enforces userId isolation
 * on all user-owned domain models (Client, Project, TimeEntry, Payment).
 */
export function getScopedPrisma(userId: string) {
  if (!userId) {
    throw new Error("Cannot create scoped database client without authenticated userId.");
  }

  return prisma.$extends({
    query: {
      client: {
        async findMany({ args, query }) {
          args.where = { ...args.where, userId };
          return query(args);
        },
        async findFirst({ args, query }) {
          args.where = { ...args.where, userId };
          return query(args);
        },
        async create({ args, query }) {
          (args.data as Record<string, unknown>).userId = userId;
          return query(args);
        },
        async update({ args, query }) {
          const existing = await prisma.client.findFirst({
            where: { id: args.where.id, userId },
          });
          if (!existing) {
            throw new Error("Client not found or unauthorized");
          }
          return query(args);
        },
        async delete({ args, query }) {
          const existing = await prisma.client.findFirst({
            where: { id: args.where.id, userId },
          });
          if (!existing) {
            throw new Error("Client not found or unauthorized");
          }
          return query(args);
        },
      },
      project: {
        async findMany({ args, query }) {
          args.where = { ...args.where, userId };
          return query(args);
        },
        async findFirst({ args, query }) {
          args.where = { ...args.where, userId };
          return query(args);
        },
        async create({ args, query }) {
          (args.data as Record<string, unknown>).userId = userId;
          return query(args);
        },
        async update({ args, query }) {
          const existing = await prisma.project.findFirst({
            where: { id: args.where.id, userId },
          });
          if (!existing) {
            throw new Error("Project not found or unauthorized");
          }
          return query(args);
        },
        async delete({ args, query }) {
          const existing = await prisma.project.findFirst({
            where: { id: args.where.id, userId },
          });
          if (!existing) {
            throw new Error("Project not found or unauthorized");
          }
          return query(args);
        },
      },
      timeEntry: {
        async findMany({ args, query }) {
          args.where = { ...args.where, userId };
          return query(args);
        },
        async findFirst({ args, query }) {
          args.where = { ...args.where, userId };
          return query(args);
        },
        async create({ args, query }) {
          (args.data as Record<string, unknown>).userId = userId;
          return query(args);
        },
        async update({ args, query }) {
          const existing = await prisma.timeEntry.findFirst({
            where: { id: args.where.id, userId },
          });
          if (!existing) {
            throw new Error("Time entry not found or unauthorized");
          }
          return query(args);
        },
        async delete({ args, query }) {
          const existing = await prisma.timeEntry.findFirst({
            where: { id: args.where.id, userId },
          });
          if (!existing) {
            throw new Error("Time entry not found or unauthorized");
          }
          return query(args);
        },
      },
      payment: {
        async findMany({ args, query }) {
          args.where = { ...args.where, userId };
          return query(args);
        },
        async findFirst({ args, query }) {
          args.where = { ...args.where, userId };
          return query(args);
        },
        async create({ args, query }) {
          (args.data as Record<string, unknown>).userId = userId;
          return query(args);
        },
        async update({ args, query }) {
          const existing = await prisma.payment.findFirst({
            where: { id: args.where.id, userId },
          });
          if (!existing) {
            throw new Error("Payment not found or unauthorized");
          }
          return query(args);
        },
        async delete({ args, query }) {
          const existing = await prisma.payment.findFirst({
            where: { id: args.where.id, userId },
          });
          if (!existing) {
            throw new Error("Payment not found or unauthorized");
          }
          return query(args);
        },
      },
    },
  });
}
