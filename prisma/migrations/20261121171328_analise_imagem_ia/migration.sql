-- CreateTable
CREATE TABLE "AnaliseImagemIa" (
    "id" TEXT NOT NULL,
    "imagemId" TEXT,
    "userId" TEXT,
    "modelo" TEXT NOT NULL,
    "vista" TEXT,
    "sucesso" BOOLEAN NOT NULL,
    "tokensEntrada" INTEGER,
    "tokensSaida" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AnaliseImagemIa_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AnaliseImagemIa_userId_createdAt_idx" ON "AnaliseImagemIa"("userId", "createdAt");

-- AddForeignKey
ALTER TABLE "AnaliseImagemIa" ADD CONSTRAINT "AnaliseImagemIa_imagemId_fkey" FOREIGN KEY ("imagemId") REFERENCES "ExameExecucaoImagem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnaliseImagemIa" ADD CONSTRAINT "AnaliseImagemIa_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
