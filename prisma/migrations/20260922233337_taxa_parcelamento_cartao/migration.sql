-- AlterTable
ALTER TABLE "Plano" DROP COLUMN "valorAte3xTrimestral";

-- CreateTable
CREATE TABLE "ConfiguracaoTaxa" (
    "id" TEXT NOT NULL,
    "chave" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "percentual" DECIMAL(5,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ConfiguracaoTaxa_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ConfiguracaoTaxa_chave_key" ON "ConfiguracaoTaxa"("chave");

