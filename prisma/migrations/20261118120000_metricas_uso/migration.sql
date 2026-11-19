-- CreateEnum
CREATE TYPE "AreaUso" AS ENUM ('CLINICA', 'PORTAL', 'PRE_CADASTRO');

-- CreateEnum
CREATE TYPE "TipoUso" AS ENUM ('TELA', 'ACAO');

-- CreateTable
CREATE TABLE "EventoUso" (
    "id" TEXT NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "area" "AreaUso" NOT NULL,
    "tipo" "TipoUso" NOT NULL,
    "chave" TEXT NOT NULL,
    "usuarioId" TEXT,

    CONSTRAINT "EventoUso_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UsoDiario" (
    "id" TEXT NOT NULL,
    "dia" DATE NOT NULL,
    "area" "AreaUso" NOT NULL,
    "tipo" "TipoUso" NOT NULL,
    "chave" TEXT NOT NULL,
    "total" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "UsoDiario_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EventoUso_criadoEm_idx" ON "EventoUso"("criadoEm");

-- CreateIndex
CREATE INDEX "EventoUso_area_tipo_chave_idx" ON "EventoUso"("area", "tipo", "chave");

-- CreateIndex
CREATE UNIQUE INDEX "UsoDiario_dia_area_tipo_chave_key" ON "UsoDiario"("dia", "area", "tipo", "chave");
