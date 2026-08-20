import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { listTreinosPaciente } from "@/actions/treinos-paciente";
import { TreinosPacienteList } from "@/components/treinos/treinos-paciente-list";
import { AtribuirTreinoButton } from "@/components/treinos/atribuir-treino-button";

export default async function PacienteTreinosPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const paciente = await prisma.paciente.findUnique({ where: { id } });
  if (!paciente) notFound();

  const treinos = await listTreinosPaciente(id);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Treinos de {paciente.nome}</h1>
          <p className="text-sm text-muted-foreground">
            Treinos atribuídos a este paciente.
          </p>
        </div>
        <AtribuirTreinoButton pacienteId={id} />
      </div>

      <TreinosPacienteList treinos={treinos} pacienteId={id} />
    </div>
  );
}
