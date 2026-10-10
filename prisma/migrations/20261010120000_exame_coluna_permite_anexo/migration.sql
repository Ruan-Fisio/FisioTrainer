-- Anexos passam a ser opt-in por coluna. Colunas já existentes mantêm o
-- comportamento anterior (todas aceitavam anexo), exceto CALCULADO.
ALTER TABLE "ExameCampoColuna" ADD COLUMN "permiteAnexo" BOOLEAN NOT NULL DEFAULT false;

UPDATE "ExameCampoColuna" SET "permiteAnexo" = true WHERE "tipo" <> 'CALCULADO';
