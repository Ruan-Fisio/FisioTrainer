-- CreateTable
CREATE TABLE "Movimento" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "grauIdeal" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Movimento_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Movimento_nome_key" ON "Movimento"("nome");
