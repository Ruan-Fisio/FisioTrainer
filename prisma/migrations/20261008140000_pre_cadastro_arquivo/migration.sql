-- CreateTable
CREATE TABLE "PreCadastroArquivo" (
    "id" TEXT NOT NULL,
    "preCadastroId" TEXT NOT NULL,
    "chave" TEXT NOT NULL,
    "nomeOriginal" TEXT NOT NULL,
    "mime" TEXT NOT NULL,
    "tamanho" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PreCadastroArquivo_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PreCadastroArquivo_chave_key" ON "PreCadastroArquivo"("chave");

-- CreateIndex
CREATE INDEX "PreCadastroArquivo_preCadastroId_idx" ON "PreCadastroArquivo"("preCadastroId");

-- AddForeignKey
ALTER TABLE "PreCadastroArquivo" ADD CONSTRAINT "PreCadastroArquivo_preCadastroId_fkey" FOREIGN KEY ("preCadastroId") REFERENCES "PreCadastro"("id") ON DELETE CASCADE ON UPDATE CASCADE;
