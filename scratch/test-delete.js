const { PrismaClient } = require('@prisma/client');
const { PrismaBetterSqlite3 } = require('@prisma/adapter-better-sqlite3');
const path = require('path');

const dbPath = path.resolve(__dirname, '../dev.db');
const adapter = new PrismaBetterSqlite3({
  url: `file:${dbPath}`,
});
const prisma = new PrismaClient({ adapter });

async function test() {
  console.log("Creating test user...");
  const user = await prisma.user.create({
    data: {
      name: "Test Agent",
      email: "test_agent_delete@example.com",
      role: "AGENT",
    },
  });
  console.log("Test user created:", user.id);

  try {
    console.log("Attempting to delete test user...");
    // 1. Set lead assignments to null for this user
    await prisma.lead.updateMany({
      where: { assignedAgentId: user.id },
      data: { assignedAgentId: null, assignedAgentName: null },
    });

    // 2. Delete the user
    await prisma.user.delete({
      where: { id: user.id },
    });
    console.log("Delete successful!");
  } catch (err) {
    console.error("Delete failed with error:", err);
  } finally {
    await prisma.$disconnect();
  }
}

test();
