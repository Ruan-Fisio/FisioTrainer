import { Sigma } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { getExecucao } from "@/actions/exame-execucoes";
import { parseGoniometriaValor } from "@/lib/goniometria";
import { parseSelecionadas } from "@/lib/multipla-escolha";
import {
  calcularColunasFormula,
  formatarNumeroFormula,
  type ResultadoFormula,
} from "@/lib/exame-formula";

export type Execucao = NonNullable<Awaited<ReturnType<typeof getExecucao>>>;

export function ValorCalculado({ resultado }: { resultado: ResultadoFormula | undefined }) {
  return (
    <div className="flex items-center gap-1.5 text-sm">
      <Sigma className="size-3.5 shrink-0 text-violet-600 dark:text-violet-400" />
      {resultado && "valor" in resultado ? (
        <span className="font-semibold text-violet-700 dark:text-violet-300">
          {formatarNumeroFormula(resultado.valor)}
        </span>
      ) : (
        <span className="text-xs text-muted-foreground">
          {resultado && "erro" in resultado ? resultado.erro : "—"}
        </span>
      )}
    </div>
  );
}

export function ValorColuna({
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

export function ExecucaoValores({ execucao }: { execucao: Execucao }) {
  const valores = execucao.valores;
  const valorPorChave = new Map(
    valores.map((v) => [`${v.colunaId}::${v.linha}`, v.valor]),
  );

  const colunasEmOrdem = execucao.exame.secoes.flatMap((secao) =>
    secao.campos.flatMap((campo) =>
      campo.colunas.map((coluna) => ({
        id: coluna.id,
        titulo: coluna.titulo,
        tipo: coluna.tipo,
        formula: coluna.formula,
        repetivel: campo.repetivel,
      })),
    ),
  );
  const resultadosCalculados = calcularColunasFormula(
    colunasEmOrdem,
    (colunaId) => valorPorChave.get(`${colunaId}::0`),
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
                            <div key={coluna.id} className="flex flex-col gap-1">
                              <p className="text-xs text-muted-foreground">
                                {coluna.titulo}
                                {coluna.formatacao
                                  ? ` (${coluna.formatacao})`
                                  : ""}
                              </p>
                              {coluna.tipo === "CALCULADO" ? (
                                <ValorCalculado
                                  resultado={resultadosCalculados.get(coluna.id)}
                                />
                              ) : (
                                <ValorColuna
                                  tipo={coluna.tipo}
                                  multiplaSelecao={coluna.multiplaSelecao}
                                  valor={
                                    valorPorChave.get(
                                      `${coluna.id}::${linha}`,
                                    ) || ""
                                  }
                                />
                              )}
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
  );
}
