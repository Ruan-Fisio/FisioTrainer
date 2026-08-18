/*
  Warnings:

  - You are about to drop the column `formaPagamento` on the `Plano` table. All the data in the column will be lost.
  - You are about to drop the column `periodicidade` on the `Plano` table. All the data in the column will be lost.
  - You are about to drop the column `formaPagamento` on the `PlanoAtribuicao` table. All the data in the column will be lost.
  - You are about to drop the column `periodicidade` on the `PlanoAtribuicao` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Plano" DROP COLUMN "formaPagamento",
DROP COLUMN "periodicidade",
ADD COLUMN     "taxaCartao" DECIMAL(5,2) NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "PlanoAtribuicao" DROP COLUMN "formaPagamento",
DROP COLUMN "periodicidade";

-- DropEnum
DROP TYPE "FormaPagamento";

-- DropEnum
DROP TYPE "Periodicidade";
