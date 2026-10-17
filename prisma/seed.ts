import { PrismaClient, ShipmentStatus, UserRole } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  if (process.env.NODE_ENV === "production" && process.env.ALLOW_PRODUCTION_SEED !== "true") {
    throw new Error("Refusing to seed production without ALLOW_PRODUCTION_SEED=true.");
  }

  const email = process.env.SEED_ADMIN_EMAIL?.trim().toLowerCase();
  const passwordHash = process.env.SEED_ADMIN_PASSWORD_HASH;
  if (email && passwordHash) {
    await prisma.user.upsert({
      where: { email },
      update: {},
      create: { email, passwordHash, role: UserRole.ADMIN },
    });
  }

  const trackingNumber = "NLX-DEMO-00001";
  await prisma.shipment.upsert({
    where: { trackingNumber },
    update: {},
    create: {
      trackingNumber,
      status: ShipmentStatus.IN_TRANSIT,
      origin: "São Paulo, Brazil",
      destination: "New York, United States",
      carrier: "Demo carrier (not live)",
    },
  });
  console.info("Seed complete. Demo shipment: NLX-DEMO-00001");
}

main().catch((error: unknown) => {
  console.error("Seed failed.");
  if (process.env.NODE_ENV !== "production") console.error(error);
  process.exitCode = 1;
}).finally(async () => {
  await prisma.$disconnect();
});
