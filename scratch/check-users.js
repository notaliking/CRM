const { PrismaClient } = require('@prisma/client');
const { PrismaBetterSqlite3 } = require('@prisma/adapter-better-sqlite3');
const path = require('path');

const dbPath = path.resolve(__dirname, '../dev.db');
const adapter = new PrismaBetterSqlite3({
  url: `file:${dbPath}`,
});
const prisma = new PrismaClient({ adapter });

async function check() {
  try {
    const users = await prisma.user.findMany({
      include: {
        _count: {
          select: {
            whatsappChats: true,
            messages: true,
          }
        }
      }
    });

    console.log("Users in Database:");
    for (const u of users) {
      console.log(`- ID: ${u.id}, Name: ${u.name}, Email: ${u.email}, Role: ${u.role}`);
      console.log(`  WhatsApp Chats: ${u._count.whatsappChats}, Messages: ${u._count.messages}`);
      
      // Count assigned leads
      const leadCount = await prisma.lead.count({ where: { assignedAgentId: u.id } });
      console.log(`  Assigned Leads: ${leadCount}`);

      // Count tasks
      const taskCount = await prisma.task.count({ where: { userId: u.id } });
      console.log(`  Tasks: ${taskCount}`);

      // Count notes
      const noteCount = await prisma.note.count({ where: { userId: u.id } });
      console.log(`  Notes: ${noteCount}`);
    }
  } catch (err) {
    console.error("Error checking users:", err);
  } finally {
    await prisma.$disconnect();
  }
}

check();
