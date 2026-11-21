-- AlterTable
ALTER TABLE "User" ADD COLUMN     "assinaturaAtualId" TEXT;

-- AlterTable
ALTER TABLE "DocumentoPaciente" ADD COLUMN     "assinaturaId" TEXT;

-- CreateTable
CREATE TABLE "AssinaturaProfissional" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "png" BYTEA NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AssinaturaProfissional_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AssinaturaProfissional_userId_idx" ON "AssinaturaProfissional"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "User_assinaturaAtualId_key" ON "User"("assinaturaAtualId");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_assinaturaAtualId_fkey" FOREIGN KEY ("assinaturaAtualId") REFERENCES "AssinaturaProfissional"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentoPaciente" ADD CONSTRAINT "DocumentoPaciente_assinaturaId_fkey" FOREIGN KEY ("assinaturaId") REFERENCES "AssinaturaProfissional"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssinaturaProfissional" ADD CONSTRAINT "AssinaturaProfissional_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

