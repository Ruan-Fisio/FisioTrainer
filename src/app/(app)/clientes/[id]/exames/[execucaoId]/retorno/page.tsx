import { notFound } from "next/navigation";
import { createRetorno, getExecucao } from "@/actions/exame-execucoes";
import { ExameExecucaoForm } from "@/components/exame-execucoes/exame-execucao-form";

export default async function NovoRetornoPage({
  params,
}: {
  params: Promise<{ id: string; execucaoId: string }>;
}) {
  const { id, execucaoId } = await params;

  const avaliacao = await getExecucao(execucaoId);

  if (!avaliacao || avaliacao.clienteId !== id || avaliacao.tipo !== "AVALIACAO") {
    notFound();
  }

  const createRetornoWithIds = createRetorno.bind(null, id, execucaoId);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Novo retorno</h1>
        <p className="text-sm text-muted-foreground">
          Registre um novo retorno do exame {avaliacao.exame.nome} para{" "}
          {avaliacao.cliente.nome}.
        </p>
      </div>
      <ExameExecucaoForm
        action={createRetornoWithIds}
        exames={[avaliacao.exame]}
        fixedExameId={avaliacao.exame.id}
        cancelHref={`/clientes/${id}/exames/${execucaoId}`}
        successLabel="Retorno registrado com sucesso."
      />
    </div>
  );
}
