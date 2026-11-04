-- CreateEnum
CREATE TYPE "CategoriaDespesa" AS ENUM ('ALUGUEL', 'ENERGIA', 'AGUA', 'INTERNET_TELEFONE', 'EQUIPAMENTO', 'MATERIAL', 'MANUTENCAO', 'IMPOSTOS', 'SALARIOS', 'SERVICOS_TERCEIROS', 'MARKETING', 'OUTROS');

-- CreateEnum
CREATE TYPE "StatusDespesa" AS ENUM ('PENDENTE', 'PAGO');

-- CreateTable
CREATE TABLE "Despesa" (
    "id" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,
    "categoria" "CategoriaDespesa" NOT NULL,
    "valor" DECIMAL(10,2) NOT NULL,
    "data" TIMESTAMPTZ(3) NOT NULL,
    "status" "StatusDespesa" NOT NULL DEFAULT 'PENDENTE',
    "pagoEm" TIMESTAMPTZ(3),
    "fornecedor" TEXT,
    "numeroDocumento" TEXT,
    "observacao" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Despesa_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Despesa_data_idx" ON "Despesa"("data");

-- CreateIndex
CREATE INDEX "Despesa_status_idx" ON "Despesa"("status");

-- CreateIndex
CREATE INDEX "Despesa_pagoEm_idx" ON "Despesa"("pagoEm");

-- CreateIndex
CREATE INDEX "Despesa_categoria_idx" ON "Despesa"("categoria");
