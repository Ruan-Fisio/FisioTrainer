-- CreateEnum
CREATE TYPE "FormaPagamentoPlano" AS ENUM ('A_VISTA', 'A_VISTA_NF', 'ATE_3X_CARTAO', 'ATE_3X_NF');

-- CreateEnum
CREATE TYPE "PeriodicidadePlano" AS ENUM ('MENSAL', 'TRIMESTRAL');

-- AlterTable: novas colunas de Plano, nullable por enquanto (backfill abaixo)
ALTER TABLE "Plano"
  ADD COLUMN "atendimentos" INTEGER,
  ADD COLUMN "valorAVistaMensal" DECIMAL(10,2),
  ADD COLUMN "valorAVistaTrimestral" DECIMAL(10,2),
  ADD COLUMN "valorAVistaNfMensal" DECIMAL(10,2),
  ADD COLUMN "valorAVistaNfTrimestral" DECIMAL(10,2),
  ADD COLUMN "valorAte3xCartaoMensal" DECIMAL(10,2),
  ADD COLUMN "valorAte3xCartaoTrimestral" DECIMAL(10,2),
  ADD COLUMN "valorAte3xNfMensal" DECIMAL(10,2),
  ADD COLUMN "valorAte3xNfTrimestral" DECIMAL(10,2);

-- AlterTable: novas colunas de PlanoAtribuicao, formaPagamento nullable por enquanto
ALTER TABLE "PlanoAtribuicao"
  ADD COLUMN "formaPagamento" "FormaPagamentoPlano",
  ADD COLUMN "periodicidade" "PeriodicidadePlano" NOT NULL DEFAULT 'MENSAL',
  ADD COLUMN "novoPlanoId" TEXT;

-- Data migration: cada Plano tinha várias PlanoOpcao (pacotes de atendimentos com
-- valor único). O novo modelo tem 1 número de atendimentos + 8 valores (4 formas de
-- pagamento x mensal/trimestral) por Plano. Cada opção antiga vira um Plano próprio:
-- a opção de menor "ordem" reaproveita a linha original do Plano, as demais viram
-- linhas novas (nome sufixado com "Nx"). O valor antigo (único) é migrado para
-- "À vista Mensal"; os outros 7 valores ficam 0 e precisam ser preenchidos manualmente.

-- 1) Captura nome/descrição/tipos ORIGINAIS de cada Plano antes de qualquer rename,
--    e já gera o id novo para cada opção que não é a primeira (rn > 1)
CREATE TABLE tmp_novas_planos AS
SELECT o.id AS "opcaoId", o."planoId" AS "planoOriginalId", o.atendimentos, o.valor,
       p.nome, p.descricao, p.tipos, p."createdAt",
       substr(md5(random()::text || clock_timestamp()::text || o.id), 1, 25) AS "novoPlanoId"
FROM "PlanoOpcao" o
JOIN "Plano" p ON p.id = o."planoId"
WHERE o.id NOT IN (
  SELECT DISTINCT ON ("planoId") id FROM "PlanoOpcao" ORDER BY "planoId", ordem ASC
);

-- 2) Linha original do Plano <- primeira opção (menor ordem)
WITH primeira_opcao AS (
  SELECT DISTINCT ON ("planoId") "planoId", id AS "opcaoId", atendimentos, valor
  FROM "PlanoOpcao"
  ORDER BY "planoId", ordem ASC
)
UPDATE "Plano" p
SET "nome" = p."nome" || ' ' || po.atendimentos || 'x',
    "atendimentos" = po.atendimentos,
    "valorAVistaMensal" = po.valor,
    "valorAVistaTrimestral" = 0,
    "valorAVistaNfMensal" = 0,
    "valorAVistaNfTrimestral" = 0,
    "valorAte3xCartaoMensal" = 0,
    "valorAte3xCartaoTrimestral" = 0,
    "valorAte3xNfMensal" = 0,
    "valorAte3xNfTrimestral" = 0
FROM primeira_opcao po
WHERE p.id = po."planoId";

-- 3) PlanoAtribuicao que apontava pra primeira opção continua no mesmo Plano
WITH primeira_opcao AS (
  SELECT DISTINCT ON ("planoId") "planoId", id AS "opcaoId"
  FROM "PlanoOpcao"
  ORDER BY "planoId", ordem ASC
)
UPDATE "PlanoAtribuicao" pa
SET "novoPlanoId" = po."planoId"
FROM primeira_opcao po
WHERE pa."planoOpcaoId" = po."opcaoId";

-- 4) Demais opções (rn > 1) viram Planos novos (nome original + sufixo), e as
--    atribuições que apontavam pra elas são remapeadas para o novo Plano
INSERT INTO "Plano" (
  id, nome, descricao, tipos, atendimentos,
  "valorAVistaMensal", "valorAVistaTrimestral", "valorAVistaNfMensal", "valorAVistaNfTrimestral",
  "valorAte3xCartaoMensal", "valorAte3xCartaoTrimestral", "valorAte3xNfMensal", "valorAte3xNfTrimestral",
  "createdAt", "updatedAt"
)
SELECT "novoPlanoId", nome || ' ' || atendimentos || 'x', descricao, tipos, atendimentos,
       valor, 0, 0, 0, 0, 0, 0, 0,
       "createdAt", now()
FROM tmp_novas_planos;

UPDATE "PlanoAtribuicao" pa
SET "novoPlanoId" = t."novoPlanoId"
FROM tmp_novas_planos t
WHERE pa."planoOpcaoId" = t."opcaoId";

-- 4) Aplica o remapeamento de planoId e limpa a coluna temporária
UPDATE "PlanoAtribuicao"
SET "planoId" = "novoPlanoId"
WHERE "novoPlanoId" IS NOT NULL;

ALTER TABLE "PlanoAtribuicao" DROP COLUMN "novoPlanoId";

DROP TABLE tmp_novas_planos;

-- 5) Fallback pra Plano sem nenhuma opção (não deveria existir, mas por segurança)
UPDATE "Plano" SET "atendimentos" = 1 WHERE "atendimentos" IS NULL;
UPDATE "Plano" SET
  "valorAVistaMensal" = COALESCE("valorAVistaMensal", 0),
  "valorAVistaTrimestral" = COALESCE("valorAVistaTrimestral", 0),
  "valorAVistaNfMensal" = COALESCE("valorAVistaNfMensal", 0),
  "valorAVistaNfTrimestral" = COALESCE("valorAVistaNfTrimestral", 0),
  "valorAte3xCartaoMensal" = COALESCE("valorAte3xCartaoMensal", 0),
  "valorAte3xCartaoTrimestral" = COALESCE("valorAte3xCartaoTrimestral", 0),
  "valorAte3xNfMensal" = COALESCE("valorAte3xNfMensal", 0),
  "valorAte3xNfTrimestral" = COALESCE("valorAte3xNfTrimestral", 0)
WHERE "valorAVistaMensal" IS NULL OR "valorAVistaTrimestral" IS NULL OR "valorAVistaNfMensal" IS NULL
   OR "valorAVistaNfTrimestral" IS NULL OR "valorAte3xCartaoMensal" IS NULL
   OR "valorAte3xCartaoTrimestral" IS NULL OR "valorAte3xNfMensal" IS NULL OR "valorAte3xNfTrimestral" IS NULL;

-- 6) formaPagamento das atribuições existentes, aproximado a partir de cartao/notaFiscal
UPDATE "PlanoAtribuicao"
SET "formaPagamento" = CASE
  WHEN "cartao" THEN 'ATE_3X_CARTAO'::"FormaPagamentoPlano"
  WHEN "notaFiscal" THEN 'A_VISTA_NF'::"FormaPagamentoPlano"
  ELSE 'A_VISTA'::"FormaPagamentoPlano"
END;

-- 7) Constraints finais (NOT NULL) e limpeza das colunas/tabela antigas
ALTER TABLE "Plano"
  ALTER COLUMN "atendimentos" SET NOT NULL,
  ALTER COLUMN "valorAVistaMensal" SET NOT NULL,
  ALTER COLUMN "valorAVistaTrimestral" SET NOT NULL,
  ALTER COLUMN "valorAVistaNfMensal" SET NOT NULL,
  ALTER COLUMN "valorAVistaNfTrimestral" SET NOT NULL,
  ALTER COLUMN "valorAte3xCartaoMensal" SET NOT NULL,
  ALTER COLUMN "valorAte3xCartaoTrimestral" SET NOT NULL,
  ALTER COLUMN "valorAte3xNfMensal" SET NOT NULL,
  ALTER COLUMN "valorAte3xNfTrimestral" SET NOT NULL;

ALTER TABLE "PlanoAtribuicao" ALTER COLUMN "formaPagamento" SET NOT NULL;

-- DropForeignKey
ALTER TABLE "PlanoAtribuicao" DROP CONSTRAINT "PlanoAtribuicao_planoOpcaoId_fkey";

-- DropForeignKey
ALTER TABLE "PlanoOpcao" DROP CONSTRAINT "PlanoOpcao_planoId_fkey";

ALTER TABLE "Plano" DROP COLUMN "taxaCartao";
ALTER TABLE "PlanoAtribuicao" DROP COLUMN "planoOpcaoId";
ALTER TABLE "PlanoAtribuicao" DROP COLUMN "taxaCartao";

-- DropTable
DROP TABLE "PlanoOpcao";
