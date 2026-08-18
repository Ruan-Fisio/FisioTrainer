/*
  Warnings:

  - You are about to drop the `Mensalidade` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "StatusCobranca" AS ENUM ('PENDENTE', 'PAGO');

-- DropForeignKey
ALTER TABLE "Mensalidade" DROP CONSTRAINT "Mensalidade_pacienteId_fkey";

-- DropForeignKey
ALTER TABLE "Mensalidade" DROP CONSTRAINT "Mensalidade_planoAtribuicaoId_fkey";

-- DropTable
DROP TABLE "Mensalidade";

-- DropEnum
DROP TYPE "StatusMensalidade";

-- CreateTable
CREATE TABLE "Cobranca" (
    "id" TEXT NOT NULL,
    "pacienteId" TEXT NOT NULL,
    "planoNome" TEXT NOT NULL,
    "valor" DECIMAL(10,2) NOT NULL,
    "vencimento" TIMESTAMP(3) NOT NULL,
    "status" "StatusCobranca" NOT NULL DEFAULT 'PENDENTE',
    "pagoEm" TIMESTAMP(3),
    "observacao" TEXT,
    "planoAtribuicaoId" TEXT,
    "numeroParcela" INTEGER,
    "totalParcelas" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Cobranca_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Cobranca_vencimento_idx" ON "Cobranca"("vencimento");

-- CreateIndex
CREATE INDEX "Cobranca_status_idx" ON "Cobranca"("status");

-- CreateIndex
CREATE INDEX "Cobranca_planoAtribuicaoId_idx" ON "Cobranca"("planoAtribuicaoId");

-- AddForeignKey
ALTER TABLE "Cobranca" ADD CONSTRAINT "Cobranca_pacienteId_fkey" FOREIGN KEY ("pacienteId") REFERENCES "Paciente"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Cobranca" ADD CONSTRAINT "Cobranca_planoAtribuicaoId_fkey" FOREIGN KEY ("planoAtribuicaoId") REFERENCES "PlanoAtribuicao"("id") ON DELETE SET NULL ON UPDATE CASCADE;
