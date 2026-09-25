-- AlterEnum
ALTER TYPE "TipoCampoExame" ADD VALUE 'CALCULADO';

-- AlterTable
ALTER TABLE "ExameCampoColuna" ADD COLUMN     "formula" TEXT;
