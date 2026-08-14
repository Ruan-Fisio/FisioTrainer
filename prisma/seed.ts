import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  const passwordHash = await bcrypt.hash("admin", 10);

  await prisma.user.upsert({
    where: { email: "admin@admin.com" },
    update: {},
    create: {
      name: "Administrador",
      email: "admin@admin.com",
      password: passwordHash,
    },
  });

  await prisma.user.upsert({
    where: { email: "sem-usuario@sistema.local" },
    update: {},
    create: {
      id: "sem-usuario",
      name: "SEM_USUARIO",
      email: "sem-usuario@sistema.local",
      password: await bcrypt.hash(crypto.randomUUID(), 10),
    },
  });

  console.log("Seed concluído: admin@admin.com criado/atualizado.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
