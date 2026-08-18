/*
  Warnings:

  - You are about to drop the column `ativo` on the `Plano` table. All the data in the column will be lost.
  - You are about to drop the column `numeroParcelas` on the `Plano` table. All the data in the column will be lost.
  - You are about to drop the column `numeroParcelas` on the `PlanoAtribuicao` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Plano" DROP COLUMN "ativo",
DROP COLUMN "numeroParcelas";

-- AlterTable
ALTER TABLE "PlanoAtribuicao" DROP COLUMN "numeroParcelas";
