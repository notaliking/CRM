import { prisma } from "./db";

async function main() {
  console.log("Clearing all existing data...");

  await prisma.message.deleteMany();
  await prisma.lead.deleteMany();
  await prisma.property.deleteMany();
  await prisma.user.deleteMany();

  console.log("All data cleared.");

  // Keep only the SuperAdmin account so there is a login to use
  await prisma.user.create({
    data: {
      name: "Khizar Ali",
      email: "notaliking7@gmail.com",
      role: "SUPERADMIN",
      avatarUrl:
        "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150",
    },
  });

  console.log("SuperAdmin account created.");
  console.log("Database is ready. All dummy data removed.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
