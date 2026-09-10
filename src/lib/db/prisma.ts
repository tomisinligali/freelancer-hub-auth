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
