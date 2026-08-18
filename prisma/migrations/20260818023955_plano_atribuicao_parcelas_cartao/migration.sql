/*
  Warnings:

  - Added the required column `numeroParcelas` to the `PlanoAtribuicao` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "PlanoAtribuicao" ADD COLUMN     "cartao" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "numeroParcelas" INTEGER NOT NULL,
ADD COLUMN     "taxaCartao" DECIMAL(5,2) NOT NULL DEFAULT 0;
