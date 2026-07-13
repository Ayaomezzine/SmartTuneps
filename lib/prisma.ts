import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

function resolveDatabaseUrl() {
  const candidates = [
    process.env.DATABASE_URL,
    process.env.POSTGRES_PRISMA_URL,
    process.env.POSTGRES_URL,
    process.env.NEON_DATABASE_URL,
    process.env.NETLIFY_DATABASE_URL
  ];

  return candidates.find((value) => typeof value === 'string' && value.trim().length > 0);
}

const databaseUrl = resolveDatabaseUrl();

if (!process.env.DATABASE_URL && databaseUrl) {
  process.env.DATABASE_URL = databaseUrl;
}

if (!databaseUrl) {
  console.error('Prisma database URL is missing. Set DATABASE_URL (or POSTGRES_URL/POSTGRES_PRISMA_URL/NEON_DATABASE_URL/NETLIFY_DATABASE_URL).');
}

export const prisma = globalForPrisma.prisma ?? new PrismaClient({
  datasources: databaseUrl
    ? {
      db: {
        url: databaseUrl
      }
    }
    : undefined,
  log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error']
});

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}