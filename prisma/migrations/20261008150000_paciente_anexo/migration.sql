-- CreateTable
CREATE TABLE "PacienteAnexo" (
    "id" TEXT NOT NULL,
    "pacienteId" TEXT NOT NULL,
    "chave" TEXT NOT NULL,
    "nomeOriginal" TEXT NOT NULL,
    "mime" TEXT NOT NULL,
    "tamanho" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PacienteAnexo_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PacienteAnexo_chave_key" ON "PacienteAnexo"("chave");

-- CreateIndex
CREATE INDEX "PacienteAnexo_pacienteId_createdAt_idx" ON "PacienteAnexo"("pacienteId", "createdAt");

-- AddForeignKey
ALTER TABLE "PacienteAnexo" ADD CONSTRAINT "PacienteAnexo_pacienteId_fkey" FOREIGN KEY ("pacienteId") REFERENCES "Paciente"("id") ON DELETE CASCADE ON UPDATE CASCADE;
