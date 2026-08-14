import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { createEvolucao } from "@/actions/evolucoes";
import { EvolucaoForm } from "@/components/evolucoes/evolucao-form";

export default async function NovaEvolucaoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const paciente = await prisma.paciente.findUnique({
    where: { id },
    select: { nome: true },
  });

  if (!paciente) notFound();

  const createEvolucaoWithPaciente = createEvolucao.bind(null, id);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Nova evolução</h1>
        <p className="text-sm text-muted-foreground">
          Registre a evolução da sessão de fisioterapia de {paciente.nome}.
        </p>
      </div>
      <EvolucaoForm
        action={createEvolucaoWithPaciente}
        pacienteId={id}
        mode="create"
      />
    </div>
  );
}
