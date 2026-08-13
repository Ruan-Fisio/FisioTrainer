-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "TipoCampoExame" ADD VALUE 'MULTIPLA_ESCOLHA';
ALTER TYPE "TipoCampoExame" ADD VALUE 'SIM_NAO';

-- AlterTable
ALTER TABLE "ExameCampoColuna" ADD COLUMN     "opcoes" TEXT[] DEFAULT ARRAY[]::TEXT[];
