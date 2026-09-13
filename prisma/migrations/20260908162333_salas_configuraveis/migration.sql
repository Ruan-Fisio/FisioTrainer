-- CreateTable
CREATE TABLE "Sala" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "ordem" INTEGER NOT NULL DEFAULT 0,
    "capacidadeEducacaoFisica" INTEGER NOT NULL DEFAULT 0,
    "capacidadeFisioterapia" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Sala_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Sala_nome_key" ON "Sala"("nome");

-- Seed inicial: Sala 1 com as capacidades que estavam fixas em src/lib/salas.ts
INSERT INTO "Sala" ("id", "nome", "ordem", "capacidadeEducacaoFisica", "capacidadeFisioterapia", "updatedAt")
VALUES ('sala_cinesioterapia', 'Sala 1 - Cinesioterapia', 0, 5, 4, CURRENT_TIMESTAMP);
