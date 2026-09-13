-- CreateEnum
CREATE TYPE "OrigemRemarcacao" AS ENUM ('PACIENTE', 'CLINICA');

-- AlterTable
ALTER TABLE "Plano" ADD COLUMN     "creditosRemarcacao" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "PlanoAtribuicao" ADD COLUMN     "creditosRemarcacao" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "CreditoRemarcacao" (
    "id" TEXT NOT NULL,
    "planoAtribuicaoId" TEXT NOT NULL,
    "agendamentoId" TEXT,
    "origem" "OrigemRemarcacao" NOT NULL,
    "justificativa" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CreditoRemarcacao_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CreditoRemarcacao_planoAtribuicaoId_createdAt_idx" ON "CreditoRemarcacao"("planoAtribuicaoId", "createdAt");

-- AddForeignKey
ALTER TABLE "CreditoRemarcacao" ADD CONSTRAINT "CreditoRemarcacao_planoAtribuicaoId_fkey" FOREIGN KEY ("planoAtribuicaoId") REFERENCES "PlanoAtribuicao"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CreditoRemarcacao" ADD CONSTRAINT "CreditoRemarcacao_agendamentoId_fkey" FOREIGN KEY ("agendamentoId") REFERENCES "Agendamento"("id") ON DELETE SET NULL ON UPDATE CASCADE;
