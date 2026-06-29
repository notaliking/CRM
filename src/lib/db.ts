import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";

const globalForPrisma = global as unknown as { prisma?: PrismaClient };

const getPrismaClient = (): PrismaClient => {
  if (globalForPrisma.prisma) {
    return globalForPrisma.prisma;
  }
  
  let connectionString = process.env.DATABASE_URL;
  if (connectionString) {
    // Strip surrounding double/single quotes and trim whitespace
    connectionString = connectionString.replace(/^["']|["']$/g, "").trim();
  }

  if (!connectionString || connectionString === "undefined") {
    throw new Error("DATABASE_URL is not set or is invalid");
  }
  
  const pool = new Pool({ connectionString });
  const adapter = new PrismaPg(pool);
  const client = new PrismaClient({ adapter });

  if (process.env.NODE_ENV !== "production") {
    globalForPrisma.prisma = client;
  }
  
  return client;
};

export const prisma = getPrismaClient();
