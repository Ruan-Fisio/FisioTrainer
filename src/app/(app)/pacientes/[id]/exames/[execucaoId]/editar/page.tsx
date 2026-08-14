import { notFound } from "next/navigation";
import { getExecucao, updateExecucao } from "@/actions/exame-execucoes";
import { listAllMovimentos } from "@/actions/movimentos";
import { ExameExecucaoForm } from "@/components/exame-execucoes/exame-execucao-form";

export default async function EditarExecucaoPage({
  params,
}: {
  params: Promise<{ id: string; execucaoId: string }>;
}) {
  const { id, execucaoId } = await params;

  const [execucao, movimentos] = await Promise.all([
    getExecucao(execucaoId),
    listAllMovimentos(),
  ]);

  if (!execucao || execucao.pacienteId !== id) notFound();

  const updateExecucaoWithIds = updateExecucao.bind(null, execucaoId, id);
  const rotulo = execucao.tipo === "AVALIACAO" ? "avaliação" : "retorno";

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Editar {rotulo}</h1>
        <p className="text-sm text-muted-foreground">
          {execucao.exame.nome} — {execucao.paciente.nome}
        </p>
      </div>
      <ExameExecucaoForm
        action={updateExecucaoWithIds}
        exames={[execucao.exame]}
        movimentos={movimentos}
        fixedExameId={execucao.exame.id}
        defaultValores={execucao.valores}
        cancelHref={`/pacientes/${id}/exames/${execucaoId}`}
        successLabel={`${rotulo === "avaliação" ? "Avaliação" : "Retorno"} atualizado com sucesso.`}
      />
    </div>
  );
}
