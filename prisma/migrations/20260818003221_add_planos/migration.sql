-- CreateEnum
CREATE TYPE "FormaPagamento" AS ENUM ('PIX', 'CARTAO_CREDITO', 'CARTAO_DEBITO', 'DINHEIRO', 'BOLETO', 'TRANSFERENCIA');

-- CreateEnum
CREATE TYPE "Periodicidade" AS ENUM ('SEMANAL', 'QUINZENAL', 'MENSAL');

-- CreateEnum
CREATE TYPE "StatusPlanoAtribuicao" AS ENUM ('ATIVO', 'CANCELADO', 'CONCLUIDO');

-- AlterTable
ALTER TABLE "Mensalidade" ADD COLUMN     "numeroParcela" INTEGER,
ADD COLUMN     "planoAtribuicaoId" TEXT,
ADD COLUMN     "totalParcelas" INTEGER;

-- CreateTable
CREATE TABLE "Plano" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "descricao" TEXT,
    "valor" DECIMAL(10,2) NOT NULL,
    "formaPagamento" "FormaPagamento" NOT NULL,
    "numeroParcelas" INTEGER NOT NULL DEFAULT 1,
    "periodicidade" "Periodicidade" NOT NULL DEFAULT 'MENSAL',
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Plano_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlanoAtribuicao" (
    "id" TEXT NOT NULL,
    "pacienteId" TEXT NOT NULL,
    "planoId" TEXT,
    "planoNome" TEXT NOT NULL,
    "valor" DECIMAL(10,2) NOT NULL,
    "formaPagamento" "FormaPagamento" NOT NULL,
    "numeroParcelas" INTEGER NOT NULL,
    "periodicidade" "Periodicidade" NOT NULL,
    "dataInicio" TIMESTAMP(3) NOT NULL,
    "status" "StatusPlanoAtribuicao" NOT NULL DEFAULT 'ATIVO',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlanoAtribuicao_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Plano_nome_key" ON "Plano"("nome");

-- CreateIndex
CREATE INDEX "PlanoAtribuicao_pacienteId_idx" ON "PlanoAtribuicao"("pacienteId");

-- CreateIndex
CREATE INDEX "Mensalidade_planoAtribuicaoId_idx" ON "Mensalidade"("planoAtribuicaoId");

-- AddForeignKey
ALTER TABLE "Mensalidade" ADD CONSTRAINT "Mensalidade_planoAtribuicaoId_fkey" FOREIGN KEY ("planoAtribuicaoId") REFERENCES "PlanoAtribuicao"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlanoAtribuicao" ADD CONSTRAINT "PlanoAtribuicao_pacienteId_fkey" FOREIGN KEY ("pacienteId") REFERENCES "Paciente"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlanoAtribuicao" ADD CONSTRAINT "PlanoAtribuicao_planoId_fkey" FOREIGN KEY ("planoId") REFERENCES "Plano"("id") ON DELETE SET NULL ON UPDATE CASCADE;
