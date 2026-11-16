-- CreateTable
CREATE TABLE "LimiteTentativa" (
    "chave" TEXT NOT NULL,
    "tentativas" INTEGER NOT NULL DEFAULT 0,
    "janelaInicio" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "bloqueadoAte" TIMESTAMP(3),
    "bloqueios" INTEGER NOT NULL DEFAULT 0,
    "atualizadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LimiteTentativa_pkey" PRIMARY KEY ("chave")
);

-- CreateIndex
CREATE INDEX "LimiteTentativa_atualizadoEm_idx" ON "LimiteTentativa"("atualizadoEm");
