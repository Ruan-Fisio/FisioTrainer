/*
  Warnings:

  - You are about to drop the column `tipo` on the `Plano` table. All the data in the column will be lost.
  - You are about to drop the column `valor` on the `Plano` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Plano" DROP COLUMN "tipo",
DROP COLUMN "valor",
ADD COLUMN     "tipos" "TipoPlano"[];

-- AlterTable
ALTER TABLE "PlanoAtribuicao" ADD COLUMN     "atendimentos" INTEGER,
ADD COLUMN     "planoOpcaoId" TEXT;

-- CreateTable
CREATE TABLE "PlanoOpcao" (
    "id" TEXT NOT NULL,
    "planoId" TEXT NOT NULL,
    "atendimentos" INTEGER NOT NULL,
    "valor" DECIMAL(10,2) NOT NULL,
    "ordem" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlanoOpcao_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "PlanoOpcao" ADD CONSTRAINT "PlanoOpcao_planoId_fkey" FOREIGN KEY ("planoId") REFERENCES "Plano"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlanoAtribuicao" ADD CONSTRAINT "PlanoAtribuicao_planoOpcaoId_fkey" FOREIGN KEY ("planoOpcaoId") REFERENCES "PlanoOpcao"("id") ON DELETE SET NULL ON UPDATE CASCADE;
