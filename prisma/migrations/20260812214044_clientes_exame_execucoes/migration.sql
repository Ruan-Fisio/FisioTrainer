-- CreateTable
CREATE TABLE "Cliente" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "idade" INTEGER,
    "cpf" TEXT,
    "contato" TEXT,
    "historicoClinico" TEXT,
    "objetivo" TEXT,
    "doencasPreexistentes" TEXT,
    "cirurgiasAnteriores" TEXT,
    "medicamentos" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Cliente_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExameExecucao" (
    "id" TEXT NOT NULL,
    "data" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "exameId" TEXT NOT NULL,
    "clienteId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExameExecucao_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExameExecucaoValor" (
    "id" TEXT NOT NULL,
    "valor" TEXT NOT NULL,
    "execucaoId" TEXT NOT NULL,
    "colunaId" TEXT NOT NULL,

    CONSTRAINT "ExameExecucaoValor_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Cliente_cpf_key" ON "Cliente"("cpf");

-- AddForeignKey
ALTER TABLE "ExameExecucao" ADD CONSTRAINT "ExameExecucao_exameId_fkey" FOREIGN KEY ("exameId") REFERENCES "Exame"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExameExecucao" ADD CONSTRAINT "ExameExecucao_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExameExecucaoValor" ADD CONSTRAINT "ExameExecucaoValor_execucaoId_fkey" FOREIGN KEY ("execucaoId") REFERENCES "ExameExecucao"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExameExecucaoValor" ADD CONSTRAINT "ExameExecucaoValor_colunaId_fkey" FOREIGN KEY ("colunaId") REFERENCES "ExameCampoColuna"("id") ON DELETE CASCADE ON UPDATE CASCADE;
