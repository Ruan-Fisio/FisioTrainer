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
          tipo: exame.tipo,
          secoes: exame.secoes.map((secao) => ({
            id: secao.id,
            nome: secao.nome,
            campos: secao.campos.map((campo) => ({
              id: campo.id,
              nome: campo.nome,
              repetivel: campo.repetivel,
              identificarMembro: campo.identificarMembro,
              colunas: campo.colunas
                .filter((coluna) => coluna.tipo !== "MEMBRO")
                .map((coluna) => ({
                  id: coluna.id,
                  titulo: coluna.titulo,
                  tipo: coluna.tipo as
                    | "NUMERO"
                    | "TEXTO"
                    | "MULTIPLA_ESCOLHA"
                    | "SIM_NAO"
                    | "GONIOMETRIA",
                  formatacao: coluna.formatacao ?? "",
                  opcoes: coluna.opcoes,
                  multiplaSelecao: coluna.multiplaSelecao,
                  valorIdeal: coluna.valorIdeal ?? "",
                  direcaoIdeal: coluna.direcaoIdeal ?? "PROXIMO_IDEAL",
                })),
            })),
          })),
        }}
        mode="edit"
      />
    </div>
  );
}
