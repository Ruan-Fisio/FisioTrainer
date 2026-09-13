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
      atendeFisioterapia: true,
      atendeEducacaoFisica: true,
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

  // Sala 1 com as capacidades de Educação Física / Fisioterapia.
  await prisma.sala.upsert({
    where: { id: "sala_cinesioterapia" },
    update: {},
    create: {
      id: "sala_cinesioterapia",
      nome: "Sala 1 - Cinesioterapia",
      ordem: 0,
      capacidadeEducacaoFisica: 5,
      capacidadeFisioterapia: 4,
    },
  });

  // Dias de funcionamento: segunda a sábado aberto, domingo fechado.
  const diasFuncionamento = [
    { diaSemana: "SEGUNDA", aberto: true },
    { diaSemana: "TERCA", aberto: true },
    { diaSemana: "QUARTA", aberto: true },
    { diaSemana: "QUINTA", aberto: true },
    { diaSemana: "SEXTA", aberto: true },
    { diaSemana: "SABADO", aberto: true },
    { diaSemana: "DOMINGO", aberto: false },
  ] as const;
  for (const dia of diasFuncionamento) {
    await prisma.diaFuncionamento.upsert({
      where: { diaSemana: dia.diaSemana },
      update: {},
      create: dia,
    });
  }

  // Grade fixa de horários padrão pra Educação Física e Fisioterapia — sem isso um
  // banco novo (dev ou E2E) não tem nenhum horário configurado e nenhum agendamento de
  // plano consegue ser criado (grade recorrente e wizard de agendamento exigem pelo
  // menos 1 horário ativo por modalidade). Ajustável depois em Configurações → Horários.
  const horariosPadrao = ["07:00", "08:00", "09:00", "10:00", "14:00", "15:00", "16:00"];
  const modalidadesComHorarioFixo = ["EDUCACAO_FISICA", "FISIOTERAPIA"] as const;
  for (const modalidade of modalidadesComHorarioFixo) {
    for (const [ordem, horario] of horariosPadrao.entries()) {
      await prisma.horarioAtendimento.upsert({
        where: { modalidade_horario: { modalidade, horario } },
        update: {},
        create: { modalidade, horario, ordem, duracaoMin: 50 },
      });
    }
  }

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
