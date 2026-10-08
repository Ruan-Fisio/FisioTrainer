-- Imagens passam a ser por coluna (e não por campo). Os registros antigos
-- referenciam ids de campo, que não são válidos como coluna; a feature acabou
-- de ser criada, então descartamos esses registros.
DELETE FROM "ExameExecucaoImagem";

DROP INDEX "ExameExecucaoImagem_execucaoId_campoId_linha_idx";

ALTER TABLE "ExameExecucaoImagem" RENAME COLUMN "campoId" TO "colunaId";

CREATE INDEX "ExameExecucaoImagem_execucaoId_colunaId_linha_idx" ON "ExameExecucaoImagem"("execucaoId", "colunaId", "linha");
