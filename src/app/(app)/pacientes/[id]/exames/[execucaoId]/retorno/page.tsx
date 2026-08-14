import { notFound } from "next/navigation";
import { createRetorno, getExecucao } from "@/actions/exame-execucoes";
import { listAllMovimentos } from "@/actions/movimentos";
import { ExameExecucaoForm } from "@/components/exame-execucoes/exame-execucao-form";
import { parseGoniometriaValor } from "@/lib/goniometria";

type Avaliacao = NonNullable<Awaited<ReturnType<typeof getExecucao>>>;

/**
 * Traz os movimentos selecionados na avaliação para os campos de Goniometria,
 * já com o grau alcançado em branco — evita ter que reselecionar o mesmo
 * conjunto de movimentos ao lançar o retorno.
 */
function valoresIniciaisRetorno(avaliacao: Avaliacao) {
  const tipoPorColuna = new Map<string, string>();
  for (const secao of avaliacao.exame.secoes) {
    for (const campo of secao.campos) {
      for (const coluna of campo.colunas) {
        tipoPorColuna.set(coluna.id, coluna.tipo);
      }
    }
  }

  return avaliacao.valores
    .filter((v) => tipoPorColuna.get(v.colunaId) === "GONIOMETRIA")
    .map((v) => {
      const entries = parseGoniometriaValor(v.valor).map((entry) => ({
        nome: entry.nome,
        lado: entry.lado,
        grauAlcancado: "",
      }));
      return { colunaId: v.colunaId, linha: v.linha, valor: JSON.stringify(entries) };
    })
    .filter((v) => v.valor !== "[]");
}

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
        defaultValores={valoresIniciaisRetorno(avaliacao)}
        cancelHref={`/pacientes/${id}/exames/${execucaoId}`}
        successLabel="Retorno registrado com sucesso."
      />
    </div>
  );
}
