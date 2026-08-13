import { notFound } from "next/navigation";
import { getExame, updateExame } from "@/actions/exames";
import { ExameForm } from "@/components/exames/exame-form";

export default async function EditarExamePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const exame = await getExame(id);

  if (!exame) notFound();

  const updateExameWithId = updateExame.bind(null, id);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Editar exame</h1>
        <p className="text-sm text-muted-foreground">
          Atualize a estrutura de {exame.nome}.
        </p>
      </div>
      <ExameForm
        action={updateExameWithId}
        defaultValues={{
          nome: exame.nome,
          descricao: exame.descricao ?? "",
          secoes: exame.secoes.map((secao) => ({
            nome: secao.nome,
            campos: secao.campos.map((campo) => ({
              nome: campo.nome,
              repetivel: campo.repetivel,
              colunas: campo.colunas.map((coluna) => ({
                titulo: coluna.titulo,
                tipo: coluna.tipo,
                formatacao: coluna.formatacao ?? "",
                opcoes: coluna.opcoes,
                multiplaSelecao: coluna.multiplaSelecao,
              })),
            })),
          })),
        }}
        mode="edit"
      />
    </div>
  );
}
