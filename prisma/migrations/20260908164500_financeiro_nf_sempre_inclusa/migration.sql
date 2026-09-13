/*
  Warnings:

  - Nota fiscal passa a ser sempre inclusa nos planos: as formas de pagamento
    `A_VISTA_NF` e `ATE_3X_NF` foram removidas do enum `FormaPagamentoPlano`.
  - Plano mensal não é parcelado e trimestral parcela em até 3x: os preços do
    `Plano` foram reduzidos a `valorAVistaMensal`, `valorAVistaTrimestral` e
    `valorAte3xTrimestral` (as demais colunas de valor foram removidas).
*/

-- AlterEnum
BEGIN;
CREATE TYPE "FormaPagamentoPlano_new" AS ENUM ('A_VISTA', 'ATE_3X_CARTAO');
ALTER TABLE "PlanoAtribuicao" ALTER COLUMN "formaPagamento" TYPE "FormaPagamentoPlano_new" USING ("formaPagamento"::text::"FormaPagamentoPlano_new");
ALTER TYPE "FormaPagamentoPlano" RENAME TO "FormaPagamentoPlano_old";
ALTER TYPE "FormaPagamentoPlano_new" RENAME TO "FormaPagamentoPlano";
DROP TYPE "FormaPagamentoPlano_old";
COMMIT;

-- AlterTable
ALTER TABLE "Plano"
  DROP COLUMN "valorAVistaNfMensal",
  DROP COLUMN "valorAVistaNfTrimestral",
  DROP COLUMN "valorAte3xCartaoMensal",
  DROP COLUMN "valorAte3xNfMensal",
  DROP COLUMN "valorAte3xNfTrimestral",
  DROP COLUMN "valorAte3xCartaoTrimestral",
  ADD COLUMN "valorAte3xTrimestral" DECIMAL(10,2) NOT NULL;
