-- CreateEnum
CREATE TYPE "TipoCampoExame" AS ENUM ('NUMERO', 'TEXTO');

-- CreateTable
CREATE TABLE "Exame" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "descricao" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Exame_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExameSecao" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "ordem" INTEGER NOT NULL,
    "exameId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExameSecao_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExameCampo" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "ordem" INTEGER NOT NULL,
    "secaoId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExameCampo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExameCampoColuna" (
    "id" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "ordem" INTEGER NOT NULL,
    "tipo" "TipoCampoExame" NOT NULL,
    "formatacao" TEXT,
    "campoId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExameCampoColuna_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "ExameSecao" ADD CONSTRAINT "ExameSecao_exameId_fkey" FOREIGN KEY ("exameId") REFERENCES "Exame"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExameCampo" ADD CONSTRAINT "ExameCampo_secaoId_fkey" FOREIGN KEY ("secaoId") REFERENCES "ExameSecao"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExameCampoColuna" ADD CONSTRAINT "ExameCampoColuna_campoId_fkey" FOREIGN KEY ("campoId") REFERENCES "ExameCampo"("id") ON DELETE CASCADE ON UPDATE CASCADE;
