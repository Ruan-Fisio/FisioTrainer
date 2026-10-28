-- AlterTable
ALTER TABLE "ExameSecao" ADD COLUMN     "origemId" TEXT;

-- AlterTable
ALTER TABLE "ExameCampo" ADD COLUMN     "origemId" TEXT;

-- AlterTable
ALTER TABLE "ExameCampoColuna" ADD COLUMN     "origemId" TEXT;

-- CreateTable
CREATE TABLE "ExameEdicaoPresenca" (
    "exameId" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "usuarioNome" TEXT NOT NULL,
    "vistoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExameEdicaoPresenca_pkey" PRIMARY KEY ("exameId","usuarioId")
);

-- CreateIndex
CREATE INDEX "ExameEdicaoPresenca_vistoEm_idx" ON "ExameEdicaoPresenca"("vistoEm");
