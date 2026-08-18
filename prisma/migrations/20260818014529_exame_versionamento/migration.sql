-- AlterTable
ALTER TABLE "Exame" ADD COLUMN     "exameOrigemId" TEXT,
ADD COLUMN     "versaoAtual" BOOLEAN NOT NULL DEFAULT true;

-- CreateIndex
CREATE INDEX "Exame_versaoAtual_idx" ON "Exame"("versaoAtual");

-- AddForeignKey
ALTER TABLE "Exame" ADD CONSTRAINT "Exame_exameOrigemId_fkey" FOREIGN KEY ("exameOrigemId") REFERENCES "Exame"("id") ON DELETE SET NULL ON UPDATE CASCADE;
