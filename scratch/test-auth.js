const { PrismaClient } = require('@prisma/client');
const { PrismaBetterSqlite3 } = require('@prisma/adapter-better-sqlite3');
const path = require('path');

const dbPath = path.resolve(__dirname, '../dev.db');
const adapter = new PrismaBetterSqlite3({ url: `file:${dbPath}` });
const prisma = new PrismaClient({ adapter });

async function runTest() {
  console.log("--- Starting Direct DB Auth Test ---");

  // 1. Check user 'ali@gmail.com'
  console.log("\n1. Finding user ali@gmail.com...");
  const user = await prisma.user.findUnique({ where: { email: 'ali@gmail.com' } });
  console.log("User:", user);

  if (user) {
    console.log("Password matches '9862472'?", user.password === '9862472');
  }

  // 2. Try creating a new user
  const testEmail = `test_${Date.now()}@gmail.com`;
  console.log(`\n2. Creating new user ${testEmail}...`);
  try {
    const newUser = await prisma.user.create({
      data: {
        name: "Test User",
        email: testEmail,
        password: "testpassword123",
        role: "AGENT"
      }
    });
    console.log("Successfully created user:", newUser);

    // 3. Try finding the new user
    console.log("\n3. Finding new user...");
    const foundNew = await prisma.user.findUnique({ where: { email: testEmail } });
    console.log("Found:", foundNew);
  } catch (err) {
    console.error("Failed to create user:", err);
  }
}

runTest()
  .then(() => prisma.$disconnect())
  .catch(err => {
    console.error(err);
    prisma.$disconnect();
  });
