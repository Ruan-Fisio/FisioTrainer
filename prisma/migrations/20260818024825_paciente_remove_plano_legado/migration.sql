/*
  Warnings:

  - You are about to drop the column `planoNome` on the `Paciente` table. All the data in the column will be lost.
  - You are about to drop the column `planoValor` on the `Paciente` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Paciente" DROP COLUMN "planoNome",
DROP COLUMN "planoValor";
