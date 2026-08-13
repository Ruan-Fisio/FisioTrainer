-- AlterTable
ALTER TABLE "ExameCampo" ADD COLUMN     "repetivel" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "ExameExecucaoValor" ADD COLUMN     "linha" INTEGER NOT NULL DEFAULT 0;
