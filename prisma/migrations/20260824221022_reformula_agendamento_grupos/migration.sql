-- AlterEnum
ALTER TYPE "TipoAgendamento" ADD VALUE 'OUTRO';

-- CreateTable
CREATE TABLE "GrupoPaciente" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GrupoPaciente_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_GrupoPacienteToPaciente" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_GrupoPacienteToPaciente_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_AgendamentoToPaciente" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_AgendamentoToPaciente_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "_GrupoPacienteToPaciente_B_index" ON "_GrupoPacienteToPaciente"("B");

-- CreateIndex
CREATE INDEX "_AgendamentoToPaciente_B_index" ON "_AgendamentoToPaciente"("B");

-- AddForeignKey
ALTER TABLE "_GrupoPacienteToPaciente" ADD CONSTRAINT "_GrupoPacienteToPaciente_A_fkey" FOREIGN KEY ("A") REFERENCES "GrupoPaciente"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_GrupoPacienteToPaciente" ADD CONSTRAINT "_GrupoPacienteToPaciente_B_fkey" FOREIGN KEY ("B") REFERENCES "Paciente"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_AgendamentoToPaciente" ADD CONSTRAINT "_AgendamentoToPaciente_A_fkey" FOREIGN KEY ("A") REFERENCES "Agendamento"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_AgendamentoToPaciente" ADD CONSTRAINT "_AgendamentoToPaciente_B_fkey" FOREIGN KEY ("B") REFERENCES "Paciente"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AlterTable: adiciona as colunas novas como opcionais para poder migrar os dados existentes antes de exigi-las
ALTER TABLE "Agendamento"
ADD COLUMN     "titulo" TEXT,
ADD COLUMN     "dataInicio" TIMESTAMP(3),
ADD COLUMN     "dataFim" TIMESTAMP(3),
ADD COLUMN     "diaInteiro" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "profissionalId" TEXT,
ADD COLUMN     "serieId" TEXT;

-- DataMigration: preserva os agendamentos existentes no novo formato (título a partir do tipo, dataFim = +50min, participante único vira m2m)
UPDATE "Agendamento"
SET
  "titulo" = CASE "tipo"
    WHEN 'AVALIACAO' THEN 'Avaliação'
    WHEN 'SESSAO' THEN 'Sessão'
    ELSE 'Retorno / Reavaliação'
  END,
  "dataInicio" = "dataHora",
  "dataFim" = "dataHora" + INTERVAL '50 minutes'
WHERE "titulo" IS NULL;

INSERT INTO "_AgendamentoToPaciente" ("A", "B")
SELECT "id", "pacienteId" FROM "Agendamento" WHERE "pacienteId" IS NOT NULL;

-- AlterTable: agora que os dados existentes foram migrados, torna as colunas obrigatórias
ALTER TABLE "Agendamento"
ALTER COLUMN "titulo" SET NOT NULL,
ALTER COLUMN "dataInicio" SET NOT NULL,
ALTER COLUMN "dataFim" SET NOT NULL;

-- DropForeignKey
ALTER TABLE "Agendamento" DROP CONSTRAINT "Agendamento_pacienteId_fkey";

-- DropIndex
DROP INDEX "Agendamento_dataHora_idx";

-- AlterTable
ALTER TABLE "Agendamento" DROP COLUMN "dataHora",
DROP COLUMN "pacienteId";

-- CreateIndex
CREATE INDEX "Agendamento_dataInicio_idx" ON "Agendamento"("dataInicio");

-- CreateIndex
CREATE INDEX "Agendamento_serieId_idx" ON "Agendamento"("serieId");

-- AddForeignKey
ALTER TABLE "Agendamento" ADD CONSTRAINT "Agendamento_profissionalId_fkey" FOREIGN KEY ("profissionalId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
