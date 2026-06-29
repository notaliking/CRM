import { PrismaClient } from "@prisma/client";
import { Pool, neonConfig } from "@neondatabase/serverless";
import { PrismaNeon } from "@prisma/adapter-neon";
import ws from "ws";

// Set WebSocket constructor for Node.js environments (like Vercel Serverless Functions)
neonConfig.webSocketConstructor = ws;

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
  const adapter = new PrismaNeon(pool as any);
  const client = new PrismaClient({ adapter });
  
  if (process.env.NODE_ENV !== "production") {
    globalForPrisma.prisma = client;
  }
  
  return client;
};

export const prisma = getPrismaClient();
