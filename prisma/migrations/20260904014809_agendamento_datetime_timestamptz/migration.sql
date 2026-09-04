-- AlterTable: passa a guardar instante real (timestamptz) em vez de timestamp naive.
-- Sem USING, o Postgres reinterpreta o valor existente no fuso da sessão (UTC),
-- preservando o instante.
ALTER TABLE "Agendamento" ALTER COLUMN "dataInicio" SET DATA TYPE TIMESTAMPTZ(3),
ALTER COLUMN "dataFim" SET DATA TYPE TIMESTAMPTZ(3);

-- Correção de dados: agendamentos criados antes desta migração tiveram a hora
-- informada (horário de Brasília) persistida como se fosse UTC, ficando 3h
-- adiantados. Reancorar em UTC-3 equivale a somar 3 horas. O filtro por createdAt
-- garante que só as linhas pré-correção sejam ajustadas (as novas já entram certas).
UPDATE "Agendamento"
SET "dataInicio" = "dataInicio" + INTERVAL '3 hours',
    "dataFim"    = "dataFim"    + INTERVAL '3 hours'
WHERE "createdAt" < TIMESTAMP '2026-09-04 02:00:00';
