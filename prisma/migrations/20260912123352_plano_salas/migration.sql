-- AlterTable
ALTER TABLE "Agendamento" ADD COLUMN     "salaId" TEXT;

-- CreateTable
CREATE TABLE "PlanoSala" (
    "id" TEXT NOT NULL,
    "planoId" TEXT NOT NULL,
    "salaId" TEXT NOT NULL,
    "descricao" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlanoSala_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PlanoSala_salaId_idx" ON "PlanoSala"("salaId");

-- CreateIndex
CREATE UNIQUE INDEX "PlanoSala_planoId_salaId_key" ON "PlanoSala"("planoId", "salaId");

-- CreateIndex
CREATE INDEX "Agendamento_salaId_idx" ON "Agendamento"("salaId");

-- AddForeignKey
ALTER TABLE "PlanoSala" ADD CONSTRAINT "PlanoSala_planoId_fkey" FOREIGN KEY ("planoId") REFERENCES "Plano"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlanoSala" ADD CONSTRAINT "PlanoSala_salaId_fkey" FOREIGN KEY ("salaId") REFERENCES "Sala"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Agendamento" ADD CONSTRAINT "Agendamento_salaId_fkey" FOREIGN KEY ("salaId") REFERENCES "Sala"("id") ON DELETE SET NULL ON UPDATE CASCADE;
