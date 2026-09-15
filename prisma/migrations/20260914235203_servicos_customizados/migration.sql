-- AlterEnum
ALTER TYPE "ModalidadeAgendamento" ADD VALUE 'OUTRO';

-- AlterTable
ALTER TABLE "Agendamento" ADD COLUMN     "servicoId" TEXT;

-- CreateTable
CREATE TABLE "Servico" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Servico_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SalaServico" (
    "id" TEXT NOT NULL,
    "salaId" TEXT NOT NULL,
    "servicoId" TEXT NOT NULL,
    "capacidade" INTEGER NOT NULL,
    "descricao" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SalaServico_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UsuarioServico" (
    "id" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "servicoId" TEXT NOT NULL,

    CONSTRAINT "UsuarioServico_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Servico_nome_key" ON "Servico"("nome");

-- CreateIndex
CREATE INDEX "SalaServico_servicoId_idx" ON "SalaServico"("servicoId");

-- CreateIndex
CREATE UNIQUE INDEX "SalaServico_salaId_servicoId_key" ON "SalaServico"("salaId", "servicoId");

-- CreateIndex
CREATE INDEX "UsuarioServico_servicoId_idx" ON "UsuarioServico"("servicoId");

-- CreateIndex
CREATE UNIQUE INDEX "UsuarioServico_usuarioId_servicoId_key" ON "UsuarioServico"("usuarioId", "servicoId");

-- CreateIndex
CREATE INDEX "Agendamento_servicoId_idx" ON "Agendamento"("servicoId");

-- AddForeignKey
ALTER TABLE "SalaServico" ADD CONSTRAINT "SalaServico_salaId_fkey" FOREIGN KEY ("salaId") REFERENCES "Sala"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalaServico" ADD CONSTRAINT "SalaServico_servicoId_fkey" FOREIGN KEY ("servicoId") REFERENCES "Servico"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UsuarioServico" ADD CONSTRAINT "UsuarioServico_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UsuarioServico" ADD CONSTRAINT "UsuarioServico_servicoId_fkey" FOREIGN KEY ("servicoId") REFERENCES "Servico"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Agendamento" ADD CONSTRAINT "Agendamento_servicoId_fkey" FOREIGN KEY ("servicoId") REFERENCES "Servico"("id") ON DELETE SET NULL ON UPDATE CASCADE;
