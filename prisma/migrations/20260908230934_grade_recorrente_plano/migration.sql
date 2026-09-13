-- AlterTable
ALTER TABLE "Agendamento" ADD COLUMN     "gradeRecorrenteId" TEXT,
ADD COLUMN     "slotData" DATE;

-- CreateTable
CREATE TABLE "GradeRecorrenteAtendimento" (
    "id" TEXT NOT NULL,
    "planoAtribuicaoId" TEXT NOT NULL,
    "modalidade" "ModalidadeAgendamento" NOT NULL,
    "diaSemana" "DiaSemana" NOT NULL,
    "horario" TEXT NOT NULL,
    "profissionalId" TEXT,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GradeRecorrenteAtendimento_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "GradeRecorrenteAtendimento_planoAtribuicaoId_idx" ON "GradeRecorrenteAtendimento"("planoAtribuicaoId");

-- CreateIndex
CREATE INDEX "Agendamento_gradeRecorrenteId_idx" ON "Agendamento"("gradeRecorrenteId");

-- AddForeignKey
ALTER TABLE "GradeRecorrenteAtendimento" ADD CONSTRAINT "GradeRecorrenteAtendimento_planoAtribuicaoId_fkey" FOREIGN KEY ("planoAtribuicaoId") REFERENCES "PlanoAtribuicao"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GradeRecorrenteAtendimento" ADD CONSTRAINT "GradeRecorrenteAtendimento_profissionalId_fkey" FOREIGN KEY ("profissionalId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Agendamento" ADD CONSTRAINT "Agendamento_gradeRecorrenteId_fkey" FOREIGN KEY ("gradeRecorrenteId") REFERENCES "GradeRecorrenteAtendimento"("id") ON DELETE SET NULL ON UPDATE CASCADE;
