"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, Trash2, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FormActions } from "@/components/ui/form-actions";
import type { ExameExecucaoActionState } from "@/actions/exame-execucoes";
import {
  GoniometriaField,
  type MovimentoOption,
} from "@/components/exame-execucoes/goniometria-field";
import { parseGoniometriaValor } from "@/lib/goniometria";
import { parseSelecionadas, toggleSelecionada } from "@/lib/multipla-escolha";

const initialState: ExameExecucaoActionState = {};

const LINHA_UNICA = "0";

export type ExameCompleto = {
  id: string;
  nome: string;
  tipo: "FISIOTERAPIA" | "EDUCACAO_FISICA";
  secoes: {
    id: string;
    nome: string;
    campos: {
      id: string;
      nome: string;
      repetivel: boolean;
      identificarMembro: boolean;
      colunas: {
        id: string;
        titulo: string;
        tipo:
          | "NUMERO"
          | "TEXTO"
          | "MULTIPLA_ESCOLHA"
          | "SIM_NAO"
          | "GONIOMETRIA"
          | "MEMBRO";
        formatacao: string | null;
        opcoes: string[];
        multiplaSelecao: boolean;
      }[];
    }[];
  }[];
};

type Secao = ExameCompleto["secoes"][number];

function gerarLinhaId() {
  return Math.random().toString(36).slice(2);
}

const TIPO_EXAME_LABELS: Record<ExameCompleto["tipo"], string> = {
  FISIOTERAPIA: "Fisioterapia",
  EDUCACAO_FISICA: "Educação Física",
};

function chaveValor(colunaId: string, linhaId: string) {
  return `${colunaId}::${linhaId}`;
}

function construirEstadoInicial(
  exame: ExameCompleto | undefined,
  defaultValores: { colunaId: string; valor: string; linha: number }[] | undefined,
) {
  const valores: Record<string, string> = {};
  const linhasPorCampo: Record<string, string[]> = {};

  if (!exame || !defaultValores || defaultValores.length === 0) {
    return { valores, linhasPorCampo };
  }

  const valorPorColunaLinha = new Map(
    defaultValores.map((v) => [`${v.colunaId}::${v.linha}`, v.valor]),
  );

  for (const secao of exame.secoes) {
    for (const campo of secao.campos) {
      const colunaIds = campo.colunas.map((c) => c.id);
      const linhasNumeros = new Set<number>();
      for (const v of defaultValores) {
        if (colunaIds.includes(v.colunaId)) linhasNumeros.add(v.linha);
      }
      const linhasOrdenadas = Array.from(linhasNumeros).sort((a, b) => a - b);
      if (linhasOrdenadas.length === 0) continue;

      const linhaIds = campo.repetivel
        ? linhasOrdenadas.map((numeroLinha) => `linha-${numeroLinha}`)
        : [LINHA_UNICA];
      if (campo.repetivel) {
        linhasPorCampo[campo.id] = linhaIds;
      }

      linhasOrdenadas.forEach((numeroLinha, idx) => {
        const linhaId = campo.repetivel ? linhaIds[idx] : LINHA_UNICA;
        for (const colunaId of colunaIds) {
          const valor = valorPorColunaLinha.get(`${colunaId}::${numeroLinha}`);
          if (valor !== undefined) {
            valores[chaveValor(colunaId, linhaId)] = valor;
          }
        }
      });
    }
  }

  return { valores, linhasPorCampo };
}

function SecaoFields({
  secao,
  linhasDoCampo,
  valores,
  updateValor,
  addLinha,
  removeLinha,
  movimentos,
}: {
  secao: Secao;
  linhasDoCampo: (campoId: string, repetivel: boolean) => string[];
  valores: Record<string, string>;
  updateValor: (colunaId: string, linhaId: string, value: string) => void;
  addLinha: (campoId: string) => void;
  removeLinha: (campoId: string, linhaId: string) => void;
  movimentos: MovimentoOption[];
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{secao.nome}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {secao.campos.map((campo) => {
          const linhas = linhasDoCampo(campo.id, campo.repetivel);
          return (
            <div key={campo.id} className="flex flex-col gap-2">
              {campo.nome && (
                <Label className="text-sm font-medium">{campo.nome}</Label>
              )}
              <div className="flex flex-col gap-3">
                {linhas.map((linhaId, linhaIndex) => (
                  <div
                    key={linhaId}
                    className={
                      campo.repetivel
                        ? "flex flex-col gap-2 rounded-lg border border-dashed border-input p-3"
                        : "flex flex-col gap-2"
                    }
                  >
                    {campo.repetivel && (
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">
                          Entrada {linhaIndex + 1}
                        </span>
                        {linhas.length > 1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => removeLinha(campo.id, linhaId)}
                          >
                            <Trash2 className="size-3.5 text-destructive" />
                            <span className="sr-only">Remover entrada</span>
                          </Button>
                        )}
                      </div>
                    )}
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      {campo.colunas.map((coluna) => {
                        const valorAtual =
                          valores[chaveValor(coluna.id, linhaId)] ?? "";
                        return (
                          <div
                            key={coluna.id}
                            className="flex flex-col gap-1.5"
                          >
                            <Label className="text-xs text-muted-foreground">
                              {coluna.titulo}
                              {coluna.formatacao
                                ? ` (${coluna.formatacao})`
                                : ""}
                            </Label>

                            {coluna.tipo === "MULTIPLA_ESCOLHA" ? (
                              <div className="flex flex-col gap-1.5 rounded-lg border border-input p-2">
                                {coluna.opcoes.map((opcao) => {
                                  const checked = coluna.multiplaSelecao
                                    ? parseSelecionadas(valorAtual).includes(
                                        opcao,
                                      )
                                    : valorAtual === opcao;
                                  const handleToggle = () => {
                                    if (coluna.multiplaSelecao) {
                                      updateValor(
                                        coluna.id,
                                        linhaId,
                                        toggleSelecionada(valorAtual, opcao),
                                      );
                                    } else {
                                      updateValor(coluna.id, linhaId, opcao);
                                    }
                                  };
                                  return (
                                    <label
                                      key={opcao}
                                      onClick={(e) => {
                                        e.preventDefault();
                                        handleToggle();
                                      }}
                                      className="flex min-h-8 cursor-pointer items-center gap-2 text-sm select-none"
                                    >
                                      {coluna.multiplaSelecao ? (
                                        <Checkbox
                                          checked={checked}
                                          tabIndex={-1}
                                          className="pointer-events-none"
                                        />
                                      ) : (
                                        <input
                                          type="radio"
                                          readOnly
                                          tabIndex={-1}
                                          className="pointer-events-none size-4 accent-primary"
                                          checked={checked}
                                        />
                                      )}
                                      {opcao}
                                    </label>
                                  );
                                })}
                              </div>
                            ) : coluna.tipo === "GONIOMETRIA" ? (
                              <GoniometriaField
                                options={movimentos}
                                value={parseGoniometriaValor(valorAtual)}
                                comLado={campo.identificarMembro}
                                onChange={(entries) =>
                                  updateValor(
                                    coluna.id,
                                    linhaId,
                                    entries.length > 0
                                      ? JSON.stringify(entries)
                                      : "",
                                  )
                                }
                              />
                            ) : coluna.tipo === "SIM_NAO" ? (
                              <select
                                className="h-8 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1 text-base transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 md:text-sm dark:bg-input/30"
                                value={valorAtual}
                                onChange={(e) =>
                                  updateValor(
                                    coluna.id,
                                    linhaId,
                                    e.target.value,
                                  )
                                }
                              >
                                <option value="">Selecione</option>
                                <option value="Sim">Sim</option>
                                <option value="Não">Não</option>
                              </select>
                            ) : coluna.tipo === "MEMBRO" ? (
                              <select
                                className="h-8 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1 text-base transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 md:text-sm dark:bg-input/30"
                                value={valorAtual}
                                onChange={(e) =>
                                  updateValor(
                                    coluna.id,
                                    linhaId,
                                    e.target.value,
                                  )
                                }
                              >
                                <option value="">Selecione</option>
                                {coluna.opcoes.map((opcao) => (
                                  <option key={opcao} value={opcao}>
                                    {opcao}
                                  </option>
                                ))}
                              </select>
                            ) : (
                              <Input
                                type={
                                  coluna.tipo === "NUMERO" ? "number" : "text"
                                }
                                value={valorAtual}
                                onChange={(e) =>
                                  updateValor(
                                    coluna.id,
                                    linhaId,
                                    e.target.value,
                                  )
                                }
                              />
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
              {campo.repetivel && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="w-fit"
                  onClick={() => addLinha(campo.id)}
                >
                  <Plus className="size-3.5" />
                  Adicionar {campo.nome || "entrada"}
                </Button>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

export function ExameExecucaoForm({
  action,
  exames,
  fixedExameId,
  defaultValores,
  cancelHref,
  successLabel,
  movimentos,
}: {
  action: (
    prevState: ExameExecucaoActionState,
    formData: FormData,
  ) => Promise<ExameExecucaoActionState>;
  exames: ExameCompleto[];
  fixedExameId?: string;
  defaultValores?: { colunaId: string; valor: string; linha: number }[];
  cancelHref: string;
  successLabel: string;
  movimentos: MovimentoOption[];
}) {
  const router = useRouter();
  const [state, formAction] = useActionState(action, initialState);
  const exameFixo = fixedExameId
    ? exames.find((e) => e.id === fixedExameId)
    : undefined;
  const [tipoSelecionado, setTipoSelecionado] = useState<
    ExameCompleto["tipo"] | null
  >(exameFixo?.tipo ?? null);
  const examesFiltrados = useMemo(
    () =>
      tipoSelecionado
        ? exames.filter((e) => e.tipo === tipoSelecionado)
        : exames,
    [exames, tipoSelecionado],
  );
  const [exameId, setExameId] = useState(
    fixedExameId ?? examesFiltrados[0]?.id ?? "",
  );
  const [passoAtual, setPassoAtual] = useState(0);
  const estadoInicial = useMemo(
    () =>
      construirEstadoInicial(
        exames.find((e) => e.id === exameId),
        defaultValores,
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );
  const [valores, setValores] = useState<Record<string, string>>(
    estadoInicial.valores,
  );
  const [linhasPorCampo, setLinhasPorCampo] = useState<
    Record<string, string[]>
  >(estadoInicial.linhasPorCampo);

  const exame = useMemo(
    () => exames.find((e) => e.id === exameId),
    [exames, exameId],
  );

  useEffect(() => {
    if (state.success) {
      toast.success(successLabel);
      router.push(cancelHref);
    }
  }, [state.success, successLabel, cancelHref, router]);

  function handleExameChange(id: string) {
    setExameId(id);
    setValores({});
    setLinhasPorCampo({});
    setPassoAtual(0);
  }

  function handleTipoChange(tipo: ExameCompleto["tipo"]) {
    setTipoSelecionado(tipo);
    const primeiroExame = exames.find((e) => e.tipo === tipo);
    handleExameChange(primeiroExame?.id ?? "");
  }

  function updateValor(colunaId: string, linhaId: string, value: string) {
    setValores((prev) => ({ ...prev, [chaveValor(colunaId, linhaId)]: value }));
  }

  function linhasDoCampo(campoId: string, repetivel: boolean) {
    if (!repetivel) return [LINHA_UNICA];
    return linhasPorCampo[campoId] ?? [LINHA_UNICA];
  }

  function addLinha(campoId: string) {
    setLinhasPorCampo((prev) => ({
      ...prev,
      [campoId]: [...(prev[campoId] ?? [LINHA_UNICA]), gerarLinhaId()],
    }));
  }

  function removeLinha(campoId: string, linhaId: string) {
    setLinhasPorCampo((prev) => ({
      ...prev,
      [campoId]: (prev[campoId] ?? [LINHA_UNICA]).filter(
        (l) => l !== linhaId,
      ),
    }));
  }

  const valoresJson = useMemo(() => {
    if (!exame) return "[]";
    const entradas: { colunaId: string; valor: string; linha: number }[] = [];
    for (const secao of exame.secoes) {
      for (const campo of secao.campos) {
        const linhas = linhasDoCampo(campo.id, campo.repetivel);
        linhas.forEach((linhaId, linhaIndex) => {
          for (const coluna of campo.colunas) {
            entradas.push({
              colunaId: coluna.id,
              valor: valores[chaveValor(coluna.id, linhaId)] ?? "",
              linha: linhaIndex,
            });
          }
        });
      }
    }
    return JSON.stringify(entradas);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [exame, valores, linhasPorCampo]);

  const secoes = exame?.secoes ?? [];
  const totalPassos = secoes.length;
  const secaoAtual = secoes[Math.min(passoAtual, totalPassos - 1)];

  return (
    <form
      action={formAction}
      className="flex max-w-3xl flex-col gap-6 pb-24"
    >
      <input type="hidden" name="exameId" value={exameId} />
      <input type="hidden" name="valores" value={valoresJson} />

      {!fixedExameId && !tipoSelecionado ? (
        <div className="flex flex-col gap-3">
          <Label>Tipo de exame</Label>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {(
              Object.keys(TIPO_EXAME_LABELS) as ExameCompleto["tipo"][]
            ).map((tipo) => (
              <button
                key={tipo}
                type="button"
                onClick={() => handleTipoChange(tipo)}
                className="rounded-lg border border-input bg-card p-4 text-left text-sm font-medium shadow-sm shadow-black/5 ring-1 ring-foreground/10 transition-colors hover:bg-accent hover:text-accent-foreground"
              >
                {TIPO_EXAME_LABELS[tipo]}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <>
          {fixedExameId ? (
            <div className="flex flex-col gap-2">
              <Label>Exame</Label>
              <p className="text-sm font-medium">{exame?.nome}</p>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between gap-2">
                <Label htmlFor="exame-select">
                  Exame ({TIPO_EXAME_LABELS[tipoSelecionado!]})
                </Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setTipoSelecionado(null)}
                >
                  Trocar tipo
                </Button>
              </div>
              <select
                id="exame-select"
                className="h-8 w-full max-w-md min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1 text-base transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 md:text-sm dark:bg-input/30"
                value={exameId}
                onChange={(e) => handleExameChange(e.target.value)}
              >
                {examesFiltrados.length === 0 && (
                  <option value="">Nenhum exame cadastrado para este tipo</option>
                )}
                {examesFiltrados.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.nome}
                  </option>
                ))}
              </select>
            </div>
          )}

          {exame && secoes.length === 0 && (
        <p className="text-sm text-muted-foreground">
          Este exame não possui seções cadastradas.
        </p>
      )}

      {/* Mobile: uma seção por vez, como um passo-a-passo */}
      {secaoAtual && (
        <div className="flex flex-col gap-3 md:hidden">
          {totalPassos > 1 && (
            <p className="text-center text-xs font-medium text-muted-foreground">
              Seção {passoAtual + 1} de {totalPassos}
            </p>
          )}
          <SecaoFields
            secao={secaoAtual}
            linhasDoCampo={linhasDoCampo}
            valores={valores}
            updateValor={updateValor}
            addLinha={addLinha}
            removeLinha={removeLinha}
            movimentos={movimentos}
          />
          {totalPassos > 1 && (
            <div className="flex items-center justify-between gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setPassoAtual((p) => Math.max(0, p - 1))}
                disabled={passoAtual === 0}
              >
                <ChevronLeft />
                Anterior
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() =>
                  setPassoAtual((p) => Math.min(totalPassos - 1, p + 1))
                }
                disabled={passoAtual === totalPassos - 1}
              >
                Próxima
                <ChevronRight />
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Desktop: todas as seções visíveis */}
      <div className="hidden flex-col gap-6 md:flex">
        {secoes.map((secao) => (
          <SecaoFields
            key={secao.id}
            secao={secao}
            linhasDoCampo={linhasDoCampo}
            valores={valores}
            updateValor={updateValor}
            addLinha={addLinha}
            removeLinha={removeLinha}
            movimentos={movimentos}
          />
        ))}
      </div>

      {state.error && (
        <p className="text-sm text-destructive">{state.error}</p>
      )}

      <FormActions
        submitLabel="Salvar"
        onCancel={() => router.push(cancelHref)}
      />
        </>
      )}
    </form>
  );
}
