-- AlterTable
ALTER TABLE "Paciente" ADD COLUMN "excluidoEm" TIMESTAMPTZ(3);

-- CreateIndex
CREATE INDEX "Paciente_excluidoEm_idx" ON "Paciente"("excluidoEm");
