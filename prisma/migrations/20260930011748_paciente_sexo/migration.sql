-- CreateEnum
CREATE TYPE "Sexo" AS ENUM ('MASCULINO', 'FEMININO');

-- AlterTable
ALTER TABLE "Paciente" ADD COLUMN     "sexo" "Sexo";
