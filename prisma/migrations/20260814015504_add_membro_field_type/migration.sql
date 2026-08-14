-- AlterEnum
ALTER TYPE "TipoCampoExame" ADD VALUE 'MEMBRO';

-- AlterTable
ALTER TABLE "ExameCampo" ADD COLUMN     "identificarMembro" BOOLEAN NOT NULL DEFAULT false;
