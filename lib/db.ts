import "server-only";
import { PrismaClient } from "@prisma/client";

// Vercel Postgres/Supabase integrations may expose the standard pooled and
// direct URLs under POSTGRES_* names. Prisma's schema uses DATABASE_URL and
// DIRECT_URL, so map the aliases before creating a client. Explicit Prisma
// variables always take precedence.
if (!process.env.DATABASE_URL && process.env.POSTGRES_PRISMA_URL) {
  process.env.DATABASE_URL = process.env.POSTGRES_PRISMA_URL;
}
if (!process.env.DIRECT_URL && process.env.POSTGRES_URL_NON_POOLING) {
  process.env.DIRECT_URL = process.env.POSTGRES_URL_NON_POOLING;
}

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

function createPrismaClient() {
  return new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });
}

/**
 * Reuse one Prisma client per warm Node.js process to avoid exhausting the
 * database connection limit during Next.js development and serverless reuse.
 * DATABASE_URL (or POSTGRES_PRISMA_URL) must be the pooled runtime URL;
 * DIRECT_URL (or POSTGRES_URL_NON_POOLING) is used by Prisma migrations.
 */
export const db = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = db;
}
