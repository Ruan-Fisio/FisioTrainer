-- CreateTable
CREATE TABLE "ExameExecucaoImagem" (
    "id" TEXT NOT NULL,
    "execucaoId" TEXT NOT NULL,
    "campoId" TEXT NOT NULL,
    "linha" INTEGER NOT NULL DEFAULT 0,
    "chave" TEXT NOT NULL,
    "nomeOriginal" TEXT NOT NULL,
    "mime" TEXT NOT NULL,
    "tamanho" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExameExecucaoImagem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ExameExecucaoImagem_chave_key" ON "ExameExecucaoImagem"("chave");

-- CreateIndex
CREATE INDEX "ExameExecucaoImagem_execucaoId_campoId_linha_idx" ON "ExameExecucaoImagem"("execucaoId", "campoId", "linha");

-- AddForeignKey
ALTER TABLE "ExameExecucaoImagem" ADD CONSTRAINT "ExameExecucaoImagem_execucaoId_fkey" FOREIGN KEY ("execucaoId") REFERENCES "ExameExecucao"("id") ON DELETE CASCADE ON UPDATE CASCADE;
