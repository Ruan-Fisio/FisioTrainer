-- AlterTable
ALTER TABLE "Cobranca" ADD COLUMN     "servicoId" TEXT,
ADD COLUMN     "taxaProfissional" DECIMAL(10,2);

-- AlterTable
ALTER TABLE "Servico" ADD COLUMN     "taxaProfissionalPercentual" DECIMAL(5,2) NOT NULL DEFAULT 0,
ADD COLUMN     "valorPadrao" DECIMAL(10,2) NOT NULL DEFAULT 0;

-- CreateIndex
CREATE INDEX "Cobranca_servicoId_idx" ON "Cobranca"("servicoId");

-- AddForeignKey
ALTER TABLE "Cobranca" ADD CONSTRAINT "Cobranca_servicoId_fkey" FOREIGN KEY ("servicoId") REFERENCES "Servico"("id") ON DELETE SET NULL ON UPDATE CASCADE;
