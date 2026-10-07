-- CreateEnum
CREATE TYPE "StatusPreCadastro" AS ENUM ('PENDENTE', 'APROVADO', 'REJEITADO');

-- CreateTable
CREATE TABLE "PreCadastro" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "sobrenome" TEXT NOT NULL,
    "celular" TEXT NOT NULL,
    "queixaPrincipal" TEXT NOT NULL,
    "status" "StatusPreCadastro" NOT NULL DEFAULT 'PENDENTE',
    "motivoRejeicao" TEXT,
    "analisadoEm" TIMESTAMP(3),
    "pacienteId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PreCadastro_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PreCadastro_pacienteId_key" ON "PreCadastro"("pacienteId");

-- CreateIndex
CREATE INDEX "PreCadastro_status_createdAt_idx" ON "PreCadastro"("status", "createdAt");

-- AddForeignKey
ALTER TABLE "PreCadastro" ADD CONSTRAINT "PreCadastro_pacienteId_fkey" FOREIGN KEY ("pacienteId") REFERENCES "Paciente"("id") ON DELETE SET NULL ON UPDATE CASCADE;
