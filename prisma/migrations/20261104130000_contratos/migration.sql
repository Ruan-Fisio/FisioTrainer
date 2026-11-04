-- CreateEnum
CREATE TYPE "StatusContrato" AS ENUM ('PENDENTE', 'ASSINADO', 'SUBSTITUIDO', 'CANCELADO');

-- CreateTable
CREATE TABLE "ContratoModelo" (
    "id" TEXT NOT NULL,
    "versao" INTEGER NOT NULL,
    "conteudo" TEXT NOT NULL,
    "contratadaId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ContratoModelo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Contrato" (
    "id" TEXT NOT NULL,
    "numero" SERIAL NOT NULL,
    "token" TEXT NOT NULL,
    "pacienteId" TEXT NOT NULL,
    "planoAtribuicaoId" TEXT NOT NULL,
    "status" "StatusContrato" NOT NULL DEFAULT 'PENDENTE',
    "tentativasCpf" INTEGER NOT NULL DEFAULT 0,
    "bloqueadoAte" TIMESTAMPTZ(3),
    "conteudo" TEXT,
    "conteudoHash" TEXT,
    "modeloVersao" INTEGER,
    "dadosPlanoHash" TEXT,
    "assinadoEm" TIMESTAMPTZ(3),
    "assinanteNome" TEXT,
    "assinanteCpf" TEXT,
    "assinanteIp" TEXT,
    "assinanteUserAgent" TEXT,
    "pdfChave" TEXT,
    "pdfHash" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Contrato_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ContratoModelo_versao_key" ON "ContratoModelo"("versao");

-- CreateIndex
CREATE UNIQUE INDEX "Contrato_numero_key" ON "Contrato"("numero");

-- CreateIndex
CREATE UNIQUE INDEX "Contrato_token_key" ON "Contrato"("token");

-- CreateIndex
CREATE INDEX "Contrato_pacienteId_idx" ON "Contrato"("pacienteId");

-- CreateIndex
CREATE INDEX "Contrato_planoAtribuicaoId_idx" ON "Contrato"("planoAtribuicaoId");

-- CreateIndex
CREATE INDEX "Contrato_status_idx" ON "Contrato"("status");

-- AddForeignKey
ALTER TABLE "ContratoModelo" ADD CONSTRAINT "ContratoModelo_contratadaId_fkey" FOREIGN KEY ("contratadaId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contrato" ADD CONSTRAINT "Contrato_pacienteId_fkey" FOREIGN KEY ("pacienteId") REFERENCES "Paciente"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contrato" ADD CONSTRAINT "Contrato_planoAtribuicaoId_fkey" FOREIGN KEY ("planoAtribuicaoId") REFERENCES "PlanoAtribuicao"("id") ON DELETE CASCADE ON UPDATE CASCADE;

