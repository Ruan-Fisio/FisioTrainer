-- AlterTable
ALTER TABLE "PlanoAtribuicao" ADD COLUMN     "desconto" DECIMAL(10,2) NOT NULL DEFAULT 0,
ADD COLUMN     "valorOriginal" DECIMAL(10,2);

-- Backfill: valor original = valor atual para atribuicoes existentes (sem desconto retroativo)
UPDATE "PlanoAtribuicao" SET "valorOriginal" = "valor" WHERE "valorOriginal" IS NULL;

-- AlterTable
ALTER TABLE "PlanoAtribuicao" ALTER COLUMN "valorOriginal" SET NOT NULL;
