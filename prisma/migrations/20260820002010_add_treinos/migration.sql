-- CreateEnum
CREATE TYPE "DiaSemana" AS ENUM ('SEGUNDA', 'TERCA', 'QUARTA', 'QUINTA', 'SEXTA', 'SABADO', 'DOMINGO');

-- CreateTable
CREATE TABLE "Treino" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "descricao" TEXT,
    "pacienteId" TEXT,
    "treinoOrigemId" TEXT,
    "dataInicio" TIMESTAMP(3),
    "dataFim" TIMESTAMP(3),
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Treino_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TreinoDia" (
    "id" TEXT NOT NULL,
    "treinoId" TEXT NOT NULL,
    "diaSemana" "DiaSemana" NOT NULL,
    "ordem" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TreinoDia_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TreinoDiaExercicio" (
    "id" TEXT NOT NULL,
    "treinoDiaId" TEXT NOT NULL,
    "exercicioId" TEXT NOT NULL,
    "ordem" INTEGER NOT NULL DEFAULT 0,
    "series" INTEGER,
    "repeticoes" TEXT,
    "carga" TEXT,
    "descanso" TEXT,
    "instrucoes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TreinoDiaExercicio_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Treino_pacienteId_idx" ON "Treino"("pacienteId");

-- CreateIndex
CREATE INDEX "TreinoDia_treinoId_idx" ON "TreinoDia"("treinoId");

-- CreateIndex
CREATE INDEX "TreinoDiaExercicio_treinoDiaId_idx" ON "TreinoDiaExercicio"("treinoDiaId");

-- AddForeignKey
ALTER TABLE "Treino" ADD CONSTRAINT "Treino_pacienteId_fkey" FOREIGN KEY ("pacienteId") REFERENCES "Paciente"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Treino" ADD CONSTRAINT "Treino_treinoOrigemId_fkey" FOREIGN KEY ("treinoOrigemId") REFERENCES "Treino"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TreinoDia" ADD CONSTRAINT "TreinoDia_treinoId_fkey" FOREIGN KEY ("treinoId") REFERENCES "Treino"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TreinoDiaExercicio" ADD CONSTRAINT "TreinoDiaExercicio_treinoDiaId_fkey" FOREIGN KEY ("treinoDiaId") REFERENCES "TreinoDia"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TreinoDiaExercicio" ADD CONSTRAINT "TreinoDiaExercicio_exercicioId_fkey" FOREIGN KEY ("exercicioId") REFERENCES "Exercicio"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
