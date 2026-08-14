import { notFound } from "next/navigation";
import { createRetorno, getExecucao } from "@/actions/exame-execucoes";
import { listAllMovimentos } from "@/actions/movimentos";
import { ExameExecucaoForm } from "@/components/exame-execucoes/exame-execucao-form";

export default async function NovoRetornoPage({
  params,
}: {
  params: Promise<{ id: string; execucaoId: string }>;
}) {
  const { id, execucaoId } = await params;

  const [avaliacao, movimentos] = await Promise.all([
    getExecucao(execucaoId),
    listAllMovimentos(),
  ]);

  if (!avaliacao || avaliacao.pacienteId !== id || avaliacao.tipo !== "AVALIACAO") {
    notFound();
  }

  const createRetornoWithIds = createRetorno.bind(null, id, execucaoId);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Novo retorno</h1>
        <p className="text-sm text-muted-foreground">
          Registre um novo retorno do exame {avaliacao.exame.nome} para{" "}
          {avaliacao.paciente.nome}.
        </p>
      </div>
      <ExameExecucaoForm
        action={createRetornoWithIds}
        exames={[avaliacao.exame]}
        movimentos={movimentos}
        fixedExameId={avaliacao.exame.id}
        cancelHref={`/pacientes/${id}/exames/${execucaoId}`}
        successLabel="Retorno registrado com sucesso."
      />
    </div>
  );
}
