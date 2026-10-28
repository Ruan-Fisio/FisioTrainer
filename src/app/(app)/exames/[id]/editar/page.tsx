import { notFound, redirect } from "next/navigation";
import { sincronizarExame } from "@/actions/exames";
import { ExameForm } from "@/components/exames/exame-form";

export default async function EditarExamePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  // Já resolve a versão atual: link antigo (ou botão Voltar) para uma versão
  // arquivada cai na edição da atual.
  const sincronizacao = await sincronizarExame(id);

  if (!sincronizacao) notFound();
  if (sincronizacao.id !== id) redirect(`/exames/${sincronizacao.id}/editar`);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Editar exame</h1>
        <p className="text-sm text-muted-foreground">
          Atualize a estrutura de {sincronizacao.draft.nome}. As alterações são
          salvas automaticamente e combinadas com as de quem estiver editando junto.
        </p>
      </div>
      <ExameForm
        mode="edit"
        defaultValues={sincronizacao.draft}
        edicao={{
          exameId: sincronizacao.id,
          carregadoEm: sincronizacao.carregadoEm,
          editores: sincronizacao.editores,
        }}
      />
    </div>
  );
}
