-- CreateTable
CREATE TABLE "AcessoCompartilhadoPaciente" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "pacienteId" TEXT NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "expiraEm" TIMESTAMP(3),
    "ultimoAcessoEm" TIMESTAMP(3),
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AcessoCompartilhadoPaciente_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AcessoCompartilhadoPaciente_token_key" ON "AcessoCompartilhadoPaciente"("token");

-- CreateIndex
CREATE INDEX "AcessoCompartilhadoPaciente_pacienteId_idx" ON "AcessoCompartilhadoPaciente"("pacienteId");

-- AddForeignKey
ALTER TABLE "AcessoCompartilhadoPaciente" ADD CONSTRAINT "AcessoCompartilhadoPaciente_pacienteId_fkey" FOREIGN KEY ("pacienteId") REFERENCES "Paciente"("id") ON DELETE CASCADE ON UPDATE CASCADE;
