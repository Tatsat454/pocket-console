import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const badges = [
    {
      key: "first_boot",
      name: "Power On",
      description: "Created a Pocket Console profile",
      icon: "🔋",
      xpReward: 10,
    },
    {
      key: "first_win",
      name: "First Victory",
      description: "Won a game",
      icon: "🏆",
      xpReward: 25,
    },
    {
      key: "roadie",
      name: "Roadie",
      description: "Earned 100 XP",
      icon: "🎒",
      xpReward: 50,
    },
  ];

  for (const b of badges) {
    await prisma.badge.upsert({
      where: { key: b.key },
      update: b,
      create: b,
    });
  }

  const cosmetics = [
    {
      key: "classic",
      name: "Classic Back",
      kind: "card_back",
      unlockXp: 0,
      preview: "#0D9488",
    },
    {
      key: "console-mint",
      name: "Console Mint",
      kind: "theme",
      unlockXp: 0,
      preview: "#D7EBE8",
    },
    {
      key: "sunset-drive",
      name: "Sunset Drive",
      kind: "theme",
      unlockXp: 200,
      preview: "#FF6B4A",
    },
  ];

  for (const c of cosmetics) {
    await prisma.cosmetic.upsert({
      where: { key: c.key },
      update: c,
      create: c,
    });
  }

  console.log("Seeded badges and cosmetics");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
