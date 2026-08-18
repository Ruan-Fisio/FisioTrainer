import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronRight, Plus, GitCompare } from "lucide-react";
import { getExecucao } from "@/actions/exame-execucoes";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ExecucaoDetailActions } from "@/components/exame-execucoes/execucao-detail-actions";
import { parseGoniometriaValor } from "@/lib/goniometria";
import { parseSelecionadas } from "@/lib/multipla-escolha";

function ValorColuna({
  tipo,
  multiplaSelecao,
  valor,
}: {
  tipo: string;
  multiplaSelecao: boolean;
  valor: string;
}) {
  if (tipo === "GONIOMETRIA") {
    const entries = parseGoniometriaValor(valor);
    if (entries.length === 0) return <p className="text-sm">—</p>;
    return (
      <ul className="flex flex-col gap-0.5 text-sm">
        {entries.map((entry, index) => (
          <li key={`${entry.nome}-${entry.lado ?? ""}-${index}`}>
            {entry.nome}
            {entry.lado ? ` (${entry.lado})` : ""}
            {entry.grauAlcancado ? `: ${entry.grauAlcancado}` : ""}
          </li>
        ))}
      </ul>
    );
  }

  if (tipo === "MULTIPLA_ESCOLHA" && multiplaSelecao) {
    return (
      <p className="text-sm">
        {parseSelecionadas(valor).filter(Boolean).join(", ") || "—"}
      </p>
    );
  }

  return <p className="text-sm">{valor || "—"}</p>;
}

export default async function ExecucaoDetailPage({
  params,
}: {
  params: Promise<{ id: string; execucaoId: string }>;
}) {
  const { id, execucaoId } = await params;

  const execucao = await getExecucao(execucaoId);

  if (!execucao || execucao.pacienteId !== id) notFound();

  const valores = execucao.valores;
  const valorPorChave = new Map(
    valores.map((v) => [`${v.colunaId}::${v.linha}`, v.valor]),
  );

  function linhasDoCampo(campo: {
    repetivel: boolean;
    colunas: { id: string }[];
  }) {
    if (!campo.repetivel) return [0];
    const linhas = new Set<number>();
    for (const coluna of campo.colunas) {
      for (const v of valores) {
        if (v.colunaId === coluna.id) linhas.add(v.linha);
      }
    }
    return linhas.size > 0 ? Array.from(linhas).sort((a, b) => a - b) : [0];
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold">{execucao.exame.nome}</h1>
            <Badge variant="secondary">
              {execucao.tipo === "AVALIACAO" ? "Avaliação" : "Retorno"}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            {execucao.paciente.nome}
            {" · "}
            {new Intl.DateTimeFormat("pt-BR", {
              dateStyle: "short",
              timeStyle: "short",
            }).format(execucao.data)}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {execucao.tipo === "AVALIACAO" && (
            <Button asChild size="sm">
              <Link href={`/pacientes/${id}/exames/${execucaoId}/retorno`}>
                <Plus />
                Novo retorno
              </Link>
            </Button>
          )}
          {execucao.tipo === "AVALIACAO" && execucao.retornos.length > 0 && (
            <Button asChild variant="outline" size="sm">
              <Link href={`/pacientes/${id}/exames/${execucaoId}/comparar`}>
                <GitCompare />
                Comparar
              </Link>
            </Button>
          )}
          <ExecucaoDetailActions
            id={execucaoId}
            pacienteId={id}
            tipo={execucao.tipo}
          />
        </div>
      </div>

      <div className="flex flex-col gap-4">
        {execucao.exame.secoes.map((secao) => (
          <Card key={secao.id}>
            <CardHeader>
              <CardTitle className="text-base">{secao.nome}</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              {secao.campos.map((campo) => {
                const linhas = linhasDoCampo(campo);
                return (
                  <div key={campo.id} className="flex flex-col gap-2">
                    {campo.nome && (
                      <p className="text-sm font-medium">{campo.nome}</p>
                    )}
                    <div className="flex flex-col gap-2">
                      {linhas.map((linha) => (
                        <div
                          key={linha}
                          className={
                            campo.repetivel
                              ? "flex flex-col gap-2 rounded-lg border border-dashed p-3"
                              : "flex flex-col gap-2"
                          }
                        >
                          {campo.repetivel && (
                            <p className="text-xs text-muted-foreground">
                              Entrada {linha + 1}
                            </p>
                          )}
                          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                            {campo.colunas.map((coluna) => (
                              <div
                                key={coluna.id}
                                className="flex flex-col gap-1"
                              >
                                <p className="text-xs text-muted-foreground">
                                  {coluna.titulo}
                                  {coluna.formatacao
                                    ? ` (${coluna.formatacao})`
                                    : ""}
                                </p>
                                <ValorColuna
                                  tipo={coluna.tipo}
                                  multiplaSelecao={coluna.multiplaSelecao}
                                  valor={
                                    valorPorChave.get(
                                      `${coluna.id}::${linha}`,
                                    ) || ""
                                  }
                                />
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        ))}
      </div>

      {execucao.tipo === "AVALIACAO" && execucao.retornos.length > 0 && (
        <div className="flex flex-col gap-3">
          <h2 className="text-lg font-semibold">Retornos</h2>
          {execucao.retornos.map((retorno) => (
            <Card key={retorno.id} className="p-0">
              <Link
                href={`/pacientes/${id}/exames/${retorno.id}`}
                className="group flex items-center justify-between gap-2 p-4 transition-colors hover:bg-primary/5"
              >
                <p className="text-sm">
                  {new Intl.DateTimeFormat("pt-BR", {
                    dateStyle: "short",
                    timeStyle: "short",
                  }).format(retorno.data)}
                </p>
                <ChevronRight className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
              </Link>
            </Card>
          ))}
        </div>
      )}

      {execucao.tipo === "RETORNO" && execucao.avaliacao && (
        <p className="text-sm text-muted-foreground">
          Retorno da avaliação de{" "}
          {new Intl.DateTimeFormat("pt-BR", {
            dateStyle: "short",
            timeStyle: "short",
          }).format(execucao.avaliacao.data)}
          {" — "}
          <Link
            href={`/pacientes/${id}/exames/${execucao.avaliacao.id}`}
            className="underline"
          >
            ver avaliação original
          </Link>
        </p>
      )}
    </div>
  );
}
