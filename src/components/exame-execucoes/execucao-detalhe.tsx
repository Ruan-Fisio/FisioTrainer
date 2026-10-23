import { File as FileIcon, Sigma } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { getExecucao } from "@/actions/exame-execucoes";
import type { ImagemExame } from "@/actions/exame-imagens";
import { parseGoniometriaValor } from "@/lib/goniometria";
import { ehImagem } from "@/lib/storage-keys";
import { parseSelecionadas } from "@/lib/multipla-escolha";
import { parsePontuacoes } from "@/lib/pontuacao-opcao";
import {
  COR_OPCAO_CLASSES,
  mapaCoresOpcoes,
  type CorOpcao,
} from "@/lib/cor-opcao";
import { cn } from "@/lib/utils";
import {
  calcularColunasFormula,
  parseVariaveis,
  formatarNumeroFormula,
  type ResultadoFormula,
} from "@/lib/exame-formula";
import { variaveisComTabelas } from "@/lib/tabela-referencia";

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

function ChipsOpcoes({
  selecionadas,
  cores,
}: {
  selecionadas: string[];
  cores: Map<string, CorOpcao>;
}) {
  return (
    <div className="flex flex-wrap gap-1.5 text-sm">
      {selecionadas.map((opcao, i) => {
        const cor = cores.get(opcao);
        return (
          <span
            key={`${opcao}-${i}`}
            className={cn(
              "rounded-md border border-transparent px-1.5 py-0.5",
              cor && COR_OPCAO_CLASSES[cor].destaque,
            )}
          >
            {opcao}
          </span>
        );
      })}
    </div>
  );
}

export function ValorColuna({
  tipo,
  multiplaSelecao,
  valor,
  coresOpcoes,
}: {
  tipo: string;
  multiplaSelecao: boolean;
  valor: string;
  /** `ExameCampoColuna.coresOpcoes` — destaca a(s) opção(ões) marcada(s). */
  coresOpcoes?: unknown;
}) {
  const cores = mapaCoresOpcoes(coresOpcoes);
  if (tipo === "MULTIPLA_ESCOLHA" && cores.size > 0) {
    const selecionadas = (
      multiplaSelecao ? parseSelecionadas(valor) : [valor]
    ).filter(Boolean);
    if (selecionadas.length === 0) return <p className="text-sm">—</p>;
    return <ChipsOpcoes selecionadas={selecionadas} cores={cores} />;
  }

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

export function ExecucaoValores({
  execucao,
  imagens = [],
}: {
  execucao: Execucao;
  /** Só na área da clínica; o portal público não recebe imagens. */
  imagens?: ImagemExame[];
}) {
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
        // MULTIPLA_ESCOLHA pontuada entra nas fórmulas pelo valor GRAVADO
        // (sem `opcoesCondicionais`: não reavalia as condições).
        opcoes: coluna.opcoes,
        multiplaSelecao: coluna.multiplaSelecao,
        pontuacoes: parsePontuacoes(coluna.pontuacoes),
      })),
    ),
  );
  const resultadosCalculados = calcularColunasFormula(
    colunasEmOrdem,
    (colunaId) => valorPorChave.get(`${colunaId}::0`),
    {
      sexo: execucao.paciente.sexo,
      idade: execucao.paciente.idade,
    },
    variaveisComTabelas(parseVariaveis(execucao.exame.variaveis), execucao.exame.tabelas),
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
                                  coresOpcoes={coluna.coresOpcoes}
                                  valor={
                                    valorPorChave.get(
                                      `${coluna.id}::${linha}`,
                                    ) || ""
                                  }
                                />
                              )}
                              {imagens.some(
                                (i) =>
                                  i.colunaId === coluna.id && i.linha === linha,
                              ) && (
                                <ul className="flex flex-wrap gap-2">
                                  {imagens
                                    .filter(
                                      (i) =>
                                        i.colunaId === coluna.id &&
                                        i.linha === linha,
                                    )
                                    .map((imagem) => (
                                      <li key={imagem.id}>
                                        {ehImagem(imagem.mime) ? (
                                          <a
                                            href={imagem.url}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="block size-20 overflow-hidden rounded-lg ring-1 ring-foreground/10"
                                          >
                                            {/* eslint-disable-next-line @next/next/no-img-element */}
                                            <img
                                              src={imagem.url}
                                              alt={imagem.nomeOriginal}
                                              className="size-full object-cover"
                                            />
                                          </a>
                                        ) : (
                                          <a
                                            href={imagem.url}
                                            className="flex h-8 max-w-48 items-center gap-1.5 rounded-lg px-2 text-xs ring-1 ring-foreground/10 hover:bg-accent"
                                          >
                                            <FileIcon className="size-3.5 shrink-0" />
                                            <span className="truncate">
                                              {imagem.nomeOriginal}
                                            </span>
                                          </a>
                                        )}
                                      </li>
                                    ))}
                                </ul>
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
