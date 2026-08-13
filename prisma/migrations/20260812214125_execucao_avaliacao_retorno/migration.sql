/*
  Warnings:

  - Added the required column `tipo` to the `ExameExecucao` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "TipoExecucaoExame" AS ENUM ('AVALIACAO', 'RETORNO');

-- AlterTable
ALTER TABLE "ExameExecucao" ADD COLUMN     "avaliacaoId" TEXT,
ADD COLUMN     "tipo" "TipoExecucaoExame" NOT NULL;

-- AddForeignKey
ALTER TABLE "ExameExecucao" ADD CONSTRAINT "ExameExecucao_avaliacaoId_fkey" FOREIGN KEY ("avaliacaoId") REFERENCES "ExameExecucao"("id") ON DELETE CASCADE ON UPDATE CASCADE;
