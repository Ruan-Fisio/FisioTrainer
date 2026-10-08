-- CreateEnum
CREATE TYPE "OrigemAnexo" AS ENUM ('CLINICA', 'PACIENTE');

-- AlterTable
ALTER TABLE "PacienteAnexo" ADD COLUMN     "origem" "OrigemAnexo" NOT NULL DEFAULT 'CLINICA';
