-- CreateTable
CREATE TABLE "DocumentoPaciente" (
    "id" TEXT NOT NULL,
    "pacienteId" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "valores" JSONB NOT NULL,
    "autorId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DocumentoPaciente_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DocumentoPaciente_pacienteId_createdAt_idx" ON "DocumentoPaciente"("pacienteId", "createdAt");

-- CreateIndex
CREATE INDEX "DocumentoPaciente_createdAt_idx" ON "DocumentoPaciente"("createdAt");

-- AddForeignKey
ALTER TABLE "DocumentoPaciente" ADD CONSTRAINT "DocumentoPaciente_pacienteId_fkey" FOREIGN KEY ("pacienteId") REFERENCES "Paciente"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentoPaciente" ADD CONSTRAINT "DocumentoPaciente_autorId_fkey" FOREIGN KEY ("autorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
