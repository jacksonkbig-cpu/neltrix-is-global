import "server-only";
import { PrismaClient } from "@prisma/client";

// Map Vercel Postgres/Supabase integration aliases to the names in schema.prisma.
// DATABASE_URL should be the pooled runtime URL; DIRECT_URL is for migrations.
if (!process.env.DATABASE_URL && process.env.POSTGRES_PRISMA_URL) {
  process.env.DATABASE_URL = process.env.POSTGRES_PRISMA_URL;
}
if (!process.env.DIRECT_URL && process.env.POSTGRES_URL_NON_POOLING) {
  process.env.DIRECT_URL = process.env.POSTGRES_URL_NON_POOLING;
}

/**
 * Supabase's shared transaction pooler (port 6543) does not support Prisma's
 * default prepared-statement behavior. Configure only that endpoint here so
 * a missing URL query parameter cannot cause intermittent raw/model query
 * failures in Vercel serverless functions. Never log or expose the URL.
 */
function configureSupabaseTransactionPooler(connectionString: string): string {
  try {
    const url = new URL(connectionString);
    if (
      url.port !== "6543" ||
      !url.hostname.endsWith(".pooler.supabase.com")
    ) {
      return connectionString;
    }

    url.searchParams.set("pgbouncer", "true");
    if (!url.searchParams.has("connection_limit")) {
      url.searchParams.set("connection_limit", "1");
    }
    return url.toString();
  } catch {
    // Let Prisma report invalid connection strings through normal safe errors.
    return connectionString;
  }
}

if (process.env.DATABASE_URL) {
  process.env.DATABASE_URL = configureSupabaseTransactionPooler(process.env.DATABASE_URL);
}

const globalForPrisma = globalThis as typeof globalThis & {
  prisma?: PrismaClient;
};

function createPrismaClient(): PrismaClient {
  return new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });
}

/**
 * Reuse the client in every environment for the lifetime of a warm Node.js
 * isolate. This does not share connections between separate serverless isolates;
 * use the pooled POSTGRES_PRISMA_URL/DATABASE_URL to avoid exhausting Postgres.
 *
 * Prisma connects lazily on the first query. Keep initialization lazy so a
 * temporarily unavailable database does not prevent unrelated routes rendering.
 */
export const db = globalForPrisma.prisma ?? createPrismaClient();
globalForPrisma.prisma = db;
