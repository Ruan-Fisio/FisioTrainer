/*
  Warnings:

  - You are about to drop the column `sinaisVitais` on the `Evolucao` table. All the data in the column will be lost.
  - Added the required column `fc` to the `Evolucao` table without a default value. This is not possible if the table is not empty.
  - Added the required column `fr` to the `Evolucao` table without a default value. This is not possible if the table is not empty.
  - Added the required column `pa` to the `Evolucao` table without a default value. This is not possible if the table is not empty.
  - Added the required column `spo2` to the `Evolucao` table without a default value. This is not possible if the table is not empty.
  - Added the required column `temperatura` to the `Evolucao` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Evolucao" DROP COLUMN "sinaisVitais",
ADD COLUMN     "fc" TEXT NOT NULL,
ADD COLUMN     "fr" TEXT NOT NULL,
ADD COLUMN     "pa" TEXT NOT NULL,
ADD COLUMN     "spo2" TEXT NOT NULL,
ADD COLUMN     "temperatura" TEXT NOT NULL;
