/*
  Warnings:

  - You are about to drop the `GrupoPaciente` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `_GrupoPacienteToPaciente` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "_GrupoPacienteToPaciente" DROP CONSTRAINT "_GrupoPacienteToPaciente_A_fkey";

-- DropForeignKey
ALTER TABLE "_GrupoPacienteToPaciente" DROP CONSTRAINT "_GrupoPacienteToPaciente_B_fkey";

-- DropTable
DROP TABLE "GrupoPaciente";

-- DropTable
DROP TABLE "_GrupoPacienteToPaciente";
