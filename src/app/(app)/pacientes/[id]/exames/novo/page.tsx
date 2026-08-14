import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { createAvaliacao, listAllExamesCompletos } from "@/actions/exame-execucoes";
import { listAllMovimentos } from "@/actions/movimentos";
import { ExameExecucaoForm } from "@/components/exame-execucoes/exame-execucao-form";

export default async function NovaAvaliacaoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [paciente, exames, movimentos] = await Promise.all([
    prisma.paciente.findUnique({ where: { id }, select: { id: true, nome: true } }),
    listAllExamesCompletos(),
    listAllMovimentos(),
  ]);

  if (!paciente) notFound();

  const createAvaliacaoWithPaciente = createAvaliacao.bind(null, id);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Nova avaliação</h1>
        <p className="text-sm text-muted-foreground">
          Selecione o exame e preencha os valores para {paciente.nome}.
        </p>
      </div>
      <ExameExecucaoForm
        action={createAvaliacaoWithPaciente}
        exames={exames}
        movimentos={movimentos}
        cancelHref={`/pacientes/${id}`}
        successLabel="Avaliação registrada com sucesso."
      />
    </div>
  );
}
