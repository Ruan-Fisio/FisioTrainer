-- AlterTable
ALTER TABLE "Agendamento" ADD COLUMN     "planoAtribuicaoId" TEXT;

-- CreateIndex
CREATE INDEX "Agendamento_planoAtribuicaoId_idx" ON "Agendamento"("planoAtribuicaoId");

-- AddForeignKey
ALTER TABLE "Agendamento" ADD CONSTRAINT "Agendamento_planoAtribuicaoId_fkey" FOREIGN KEY ("planoAtribuicaoId") REFERENCES "PlanoAtribuicao"("id") ON DELETE SET NULL ON UPDATE CASCADE;
