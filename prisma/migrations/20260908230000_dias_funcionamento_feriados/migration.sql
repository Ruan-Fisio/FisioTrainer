-- CreateTable
CREATE TABLE "DiaFuncionamento" (
    "id" TEXT NOT NULL,
    "diaSemana" "DiaSemana" NOT NULL,
    "aberto" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DiaFuncionamento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Feriado" (
    "id" TEXT NOT NULL,
    "data" DATE NOT NULL,
    "descricao" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Feriado_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DiaFuncionamento_diaSemana_key" ON "DiaFuncionamento"("diaSemana");

-- CreateIndex
CREATE UNIQUE INDEX "Feriado_data_key" ON "Feriado"("data");

-- Seed inicial: segunda a sábado aberto, domingo fechado.
INSERT INTO "DiaFuncionamento" ("id", "diaSemana", "aberto", "updatedAt") VALUES
    ('diafunc_segunda', 'SEGUNDA', true, CURRENT_TIMESTAMP),
    ('diafunc_terca', 'TERCA', true, CURRENT_TIMESTAMP),
    ('diafunc_quarta', 'QUARTA', true, CURRENT_TIMESTAMP),
    ('diafunc_quinta', 'QUINTA', true, CURRENT_TIMESTAMP),
    ('diafunc_sexta', 'SEXTA', true, CURRENT_TIMESTAMP),
    ('diafunc_sabado', 'SABADO', true, CURRENT_TIMESTAMP),
    ('diafunc_domingo', 'DOMINGO', false, CURRENT_TIMESTAMP);
