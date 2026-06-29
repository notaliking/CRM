const { PrismaClient } = require('@prisma/client');
const { PrismaBetterSqlite3 } = require('@prisma/adapter-better-sqlite3');
const path = require('path');

const dbPath = path.resolve(__dirname, '../dev.db');
const adapter = new PrismaBetterSqlite3({
  url: `file:${dbPath}`,
});
const prisma = new PrismaClient({ adapter });

async function test() {
  const targetUserId = "7f6fe248-bfcf-41f3-87d8-174b129b2594"; // Test User
  console.log(`Attempting to delete user ${targetUserId}...`);

  try {
    await prisma.$transaction([
      prisma.lead.updateMany({
        where: { assignedAgentId: targetUserId },
        data: { assignedAgentId: null, assignedAgentName: null },
      }),
      prisma.message.updateMany({
        where: { senderId: targetUserId },
        data: { senderId: null },
      }),
      prisma.whatsappChat.deleteMany({
        where: { userId: targetUserId },
      }),
      prisma.user.delete({
        where: { id: targetUserId },
      }),
    ]);
    console.log("SUCCESS: User deleted successfully from DB!");
  } catch (err) {
    console.error("FAILURE: Database deletion failed:", err);
  } finally {
    await prisma.$disconnect();
  }
}

test();
