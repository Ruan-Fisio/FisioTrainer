/*
  Warnings:

  - You are about to drop the column `profissional` on the `Evolucao` table. All the data in the column will be lost.
  - Added the required column `profissionalId` to the `Evolucao` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Evolucao" DROP COLUMN "profissional",
ADD COLUMN     "profissionalId" TEXT NOT NULL;

-- AddForeignKey
ALTER TABLE "Evolucao" ADD CONSTRAINT "Evolucao_profissionalId_fkey" FOREIGN KEY ("profissionalId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
