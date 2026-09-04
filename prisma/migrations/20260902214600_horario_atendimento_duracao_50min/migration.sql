-- Reduz a duração das sessões pré-configuradas para 50 minutos, mantendo os mesmos horários de início.
UPDATE "HorarioAtendimento" SET "duracaoMin" = 50;

-- AlterTable: novos horários cadastrados também passam a ter 50 min de duração por padrão
ALTER TABLE "HorarioAtendimento" ALTER COLUMN "duracaoMin" SET DEFAULT 50;
