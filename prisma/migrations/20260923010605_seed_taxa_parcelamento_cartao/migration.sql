-- A migration anterior (20260922233337_taxa_parcelamento_cartao) criou a tabela
-- "ConfiguracaoTaxa" mas nao inseriu a linha padrao — só prisma/seed.ts fazia isso,
-- e seed.ts não roda automaticamente no deploy de produção (só migrate deploy no build).
-- Resultado: em produção a tela Configurações > Financeiro ficava sem nenhum card,
-- já que listConfiguracoesTaxa() lê a tabela vazia. Esta migration garante a linha
-- via SQL, que roda em qualquer ambiente através de "prisma migrate deploy".
INSERT INTO "ConfiguracaoTaxa" ("id", "chave", "nome", "percentual", "createdAt", "updatedAt")
VALUES (
  'cm_seed_taxa_parcelamento_cartao',
  'PARCELAMENTO_CARTAO',
  'Parcelamento no cartão (por parcela)',
  2.3,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
)
ON CONFLICT ("chave") DO NOTHING;
