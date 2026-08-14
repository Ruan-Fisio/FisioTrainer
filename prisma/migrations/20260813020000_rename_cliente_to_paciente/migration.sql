-- Rename "Cliente" entity to "Paciente" (table, columns, constraints, indexes)

ALTER TABLE "ExameExecucao" DROP CONSTRAINT "ExameExecucao_clienteId_fkey";

ALTER TABLE "Cliente" RENAME TO "Paciente";

ALTER TABLE "Paciente" RENAME CONSTRAINT "Cliente_pkey" TO "Paciente_pkey";

ALTER INDEX "Cliente_cpf_key" RENAME TO "Paciente_cpf_key";

ALTER TABLE "ExameExecucao" RENAME COLUMN "clienteId" TO "pacienteId";

ALTER TABLE "ExameExecucao" ADD CONSTRAINT "ExameExecucao_pacienteId_fkey" FOREIGN KEY ("pacienteId") REFERENCES "Paciente"("id") ON DELETE CASCADE ON UPDATE CASCADE;
