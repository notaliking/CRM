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
      name: "Complex Test Agent",
      email: "complex_test_delete@example.com",
      role: "AGENT",
    },
  });

  console.log("Creating related records...");
  
  // 1. Create a lead assigned to this user
  const lead = await prisma.lead.create({
    data: {
      name: "Test Lead",
      source: "Website Form",
      status: "NEW",
      assignedAgentId: user.id,
      assignedAgentName: user.name,
    }
  });

  // 2. Create a message sent by this user
  await prisma.message.create({
    data: {
      leadId: lead.id,
      senderId: user.id,
      content: "Hello from agent",
      isFromLead: false,
    }
  });

  // 3. Create a WhatsApp chat for this user
  await prisma.whatsappChat.create({
    data: {
      userId: user.id,
      contactName: "WA Contact",
      contactPhone: "923001234567",
      lastMessage: "Hi",
      messages: JSON.stringify([{ sender: "lead", text: "Hi", time: new Date().toISOString() }]),
    }
  });

  // 4. Create a task for this user
  await prisma.task.create({
    data: {
      leadId: lead.id,
      userId: user.id,
      title: "Follow up",
      dueDate: new Date(),
      status: "PENDING",
    }
  });

  // 5. Create a note by this user
  await prisma.note.create({
    data: {
      leadId: lead.id,
      userId: user.id,
      userName: user.name,
      content: "Important note",
    }
  });

  console.log("All related records created. Now attempting deletion...");

  try {
    // Run the actual deleteUserAction logic
    // 1. Set lead assignments to null for this user
    await prisma.lead.updateMany({
      where: { assignedAgentId: user.id },
      data: { assignedAgentId: null, assignedAgentName: null },
    });

    // 2. Delete the user
    await prisma.user.delete({
      where: { id: user.id },
    });
    console.log("SUCCESS: User and all relations deleted/updated cleanly!");
  } catch (err) {
    console.error("FAILURE: Deletion failed with error:", err);
  } finally {
    // Cleanup remaining test records if any
    try {
      await prisma.message.deleteMany({ where: { leadId: lead.id } });
      await prisma.task.deleteMany({ where: { leadId: lead.id } });
      await prisma.note.deleteMany({ where: { leadId: lead.id } });
      await prisma.lead.delete({ where: { id: lead.id } });
      await prisma.whatsappChat.deleteMany({ where: { userId: user.id } });
      await prisma.user.delete({ where: { id: user.id } }).catch(() => {});
    } catch (cleanErr) {
      console.error("Cleanup error:", cleanErr);
    }
    await prisma.$disconnect();
  }
}

test();
