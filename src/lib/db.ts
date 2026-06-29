import { PrismaClient } from "@prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import path from "path";

const globalForPrisma = global as unknown as { prisma?: PrismaClient };

const getPrismaClient = (): PrismaClient => {
  if (globalForPrisma.prisma) {
    return globalForPrisma.prisma;
  }

  // Resolve the database path relative to the root directory or env
  const dbPath = process.env.DATABASE_PATH 
    ? path.resolve(process.env.DATABASE_PATH)
    : path.resolve(process.cwd(), "dev.db");
  
  // In Prisma 7, the better-sqlite3 adapter instantiates the database internally 
  // and expects an options object containing the URL.
  const adapter = new PrismaBetterSqlite3({
    url: `file:${dbPath}`,
  });
  
  const client = new PrismaClient({ adapter });
  
  if (process.env.NODE_ENV !== "production") {
    globalForPrisma.prisma = client;
  }
  
  return client;
};

export const prisma = getPrismaClient();
