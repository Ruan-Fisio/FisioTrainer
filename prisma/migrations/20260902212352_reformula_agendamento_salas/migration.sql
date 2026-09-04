-- CreateEnum
CREATE TYPE "ModalidadeAgendamento" AS ENUM ('EDUCACAO_FISICA', 'FISIOTERAPIA', 'AVALIACAO', 'TERAPIA_MANUAL');

-- AlterTable: adiciona a nova coluna já populada a partir do "tipo" antigo
ALTER TABLE "Agendamento" ADD COLUMN "modalidade" "ModalidadeAgendamento" NOT NULL DEFAULT 'FISIOTERAPIA';

UPDATE "Agendamento"
SET "modalidade" = CASE "tipo"
  WHEN 'AVALIACAO' THEN 'AVALIACAO'
  ELSE 'FISIOTERAPIA'
END::"ModalidadeAgendamento";

-- DropColumn
ALTER TABLE "Agendamento" DROP COLUMN "tipo";

-- DropEnum
DROP TYPE "TipoAgendamento";

-- CreateIndex
CREATE INDEX "Agendamento_modalidade_idx" ON "Agendamento"("modalidade");

-- CreateTable
CREATE TABLE "HorarioAtendimento" (
    "id" TEXT NOT NULL,
    "modalidade" "ModalidadeAgendamento" NOT NULL,
    "horario" TEXT NOT NULL,
    "duracaoMin" INTEGER NOT NULL DEFAULT 60,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "ordem" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HorarioAtendimento_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "HorarioAtendimento_modalidade_idx" ON "HorarioAtendimento"("modalidade");

-- CreateIndex
CREATE UNIQUE INDEX "HorarioAtendimento_modalidade_horario_key" ON "HorarioAtendimento"("modalidade", "horario");

-- Horários pré-estabelecidos (configuráveis depois pela tela de Configurações)
INSERT INTO "HorarioAtendimento" ("id", "modalidade", "horario", "duracaoMin", "ativo", "ordem", "createdAt", "updatedAt")
VALUES
  (md5(random()::text || clock_timestamp()::text), 'EDUCACAO_FISICA', '06:10', 60, true, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (md5(random()::text || clock_timestamp()::text), 'EDUCACAO_FISICA', '07:10', 60, true, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (md5(random()::text || clock_timestamp()::text), 'EDUCACAO_FISICA', '08:10', 60, true, 2, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (md5(random()::text || clock_timestamp()::text), 'EDUCACAO_FISICA', '09:10', 60, true, 3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (md5(random()::text || clock_timestamp()::text), 'EDUCACAO_FISICA', '10:10', 60, true, 4, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (md5(random()::text || clock_timestamp()::text), 'EDUCACAO_FISICA', '17:10', 60, true, 5, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (md5(random()::text || clock_timestamp()::text), 'EDUCACAO_FISICA', '18:10', 60, true, 6, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (md5(random()::text || clock_timestamp()::text), 'EDUCACAO_FISICA', '19:10', 60, true, 7, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (md5(random()::text || clock_timestamp()::text), 'FISIOTERAPIA', '13:10', 60, true, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (md5(random()::text || clock_timestamp()::text), 'FISIOTERAPIA', '14:10', 60, true, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (md5(random()::text || clock_timestamp()::text), 'FISIOTERAPIA', '15:10', 60, true, 2, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (md5(random()::text || clock_timestamp()::text), 'FISIOTERAPIA', '16:10', 60, true, 3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
