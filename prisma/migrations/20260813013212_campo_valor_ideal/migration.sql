-- CreateEnum
CREATE TYPE "DirecaoIdealCampo" AS ENUM ('MAIOR_MELHOR', 'MENOR_MELHOR', 'PROXIMO_IDEAL');

-- AlterTable
ALTER TABLE "ExameCampoColuna" ADD COLUMN     "direcaoIdeal" "DirecaoIdealCampo",
ADD COLUMN     "valorIdeal" TEXT;
