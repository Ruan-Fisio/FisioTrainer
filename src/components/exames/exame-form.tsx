"use client";

import { useActionState, useEffect, useState } from "react";
import { useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Plus,
  Trash2,
  GripVertical,
  Copy,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import type { ExameActionState } from "@/actions/exames";

const initialState: ExameActionState = {};

type TipoColuna =
  | "NUMERO"
  | "TEXTO"
  | "MULTIPLA_ESCOLHA"
  | "SIM_NAO"
  | "GONIOMETRIA";
type DirecaoIdeal = "MAIOR_MELHOR" | "MENOR_MELHOR" | "PROXIMO_IDEAL";
type ColunaDraft = {
  titulo: string;
  tipo: TipoColuna;
  formatacao: string;
  opcoes: string[];
  multiplaSelecao: boolean;
  valorIdeal: string;
  direcaoIdeal: DirecaoIdeal;
};
type CampoDraft = {
  nome: string;
  repetivel: boolean;
  colunas: ColunaDraft[];
};
type SecaoDraft = { nome: string; campos: CampoDraft[] };

const TIPO_COLUNA_LABELS: Record<TipoColuna, string> = {
  TEXTO: "Texto",
  NUMERO: "Número",
  MULTIPLA_ESCOLHA: "Múltipla escolha",
  SIM_NAO: "Sim/Não",
  GONIOMETRIA: "Recovery em Goniometria",
};

const DIRECAO_IDEAL_LABELS: Record<DirecaoIdeal, string> = {
  MAIOR_MELHOR: "Maior é melhor",
  MENOR_MELHOR: "Menor é melhor",
  PROXIMO_IDEAL: "Mais próximo do valor ideal",
};

function novaColuna(): ColunaDraft {
  return {
    titulo: "",
    tipo: "TEXTO",
    formatacao: "",
    opcoes: [],
    multiplaSelecao: false,
    valorIdeal: "",
    direcaoIdeal: "PROXIMO_IDEAL",
  };
}

function novoCampo(): CampoDraft {
  return { nome: "", repetivel: false, colunas: [novaColuna()] };
}

function novaSecao(): SecaoDraft {
  return { nome: "", campos: [novoCampo()] };
}

function SubmitButton({
  label,
  className,
}: {
  label: string;
  className?: string;
}) {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" disabled={pending} className={className}>
      {pending ? "Salvando..." : label}
    </Button>
  );
}

function selectClassName() {
  return "h-8 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1 text-base transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 md:text-sm dark:bg-input/30";
}

type SecaoCardProps = {
  secao: SecaoDraft;
  secaoIndex: number;
  totalSecoes: number;
  permitirRetrair: boolean;
  retraida: boolean;
  onToggleRetraida: () => void;
  arrastavel: boolean;
  onDragStart?: () => void;
  onDragEnd?: () => void;
  onDragOver?: (e: React.DragEvent) => void;
  onDrop?: () => void;
  updateSecao: (index: number, patch: Partial<SecaoDraft>) => void;
  duplicarSecao: (index: number) => void;
  removeSecao: (index: number) => void;
  updateCampo: (
    secaoIndex: number,
    campoIndex: number,
    patch: Partial<CampoDraft>,
  ) => void;
  addCampo: (secaoIndex: number) => void;
  removeCampo: (secaoIndex: number, campoIndex: number) => void;
  duplicarCampo: (secaoIndex: number, campoIndex: number) => void;
  updateColuna: (
    secaoIndex: number,
    campoIndex: number,
    colunaIndex: number,
    patch: Partial<ColunaDraft>,
  ) => void;
  addColuna: (secaoIndex: number, campoIndex: number) => void;
  removeColuna: (
    secaoIndex: number,
    campoIndex: number,
    colunaIndex: number,
  ) => void;
  duplicarColuna: (
    secaoIndex: number,
    campoIndex: number,
    colunaIndex: number,
  ) => void;
  updateOpcao: (
    secaoIndex: number,
    campoIndex: number,
    colunaIndex: number,
    opcaoIndex: number,
    value: string,
  ) => void;
  addOpcao: (
    secaoIndex: number,
    campoIndex: number,
    colunaIndex: number,
  ) => void;
  removeOpcao: (
    secaoIndex: number,
    campoIndex: number,
    colunaIndex: number,
    opcaoIndex: number,
  ) => void;
};

function SecaoCard({
  secao,
  secaoIndex,
  totalSecoes,
  permitirRetrair,
  retraida,
  onToggleRetraida,
  arrastavel,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDrop,
  updateSecao,
  duplicarSecao,
  removeSecao,
  updateCampo,
  addCampo,
  removeCampo,
  duplicarCampo,
  updateColuna,
  addColuna,
  removeColuna,
  duplicarColuna,
  updateOpcao,
  addOpcao,
  removeOpcao,
}: SecaoCardProps) {
  const aberta = !permitirRetrair || !retraida;

  const conteudoCampos = (
    <CardContent className="flex flex-col gap-3 pt-4">
      {secao.campos.map((campo, campoIndex) => (
        <Card key={campoIndex} className="bg-muted/30">
          <CardContent className="flex flex-col gap-3 p-4">
            <div className="flex items-start gap-2">
              <div className="flex-1">
                <div className="flex flex-col gap-1.5">
                  <Label>
                    Nome{" "}
                    <span className="text-muted-foreground">(opcional)</span>
                  </Label>
                  <Input
                    value={campo.nome}
                    onChange={(e) =>
                      updateCampo(secaoIndex, campoIndex, {
                        nome: e.target.value,
                      })
                    }
                    placeholder="Ex: Circunferência do Braço — deixe em branco para não exibir"
                  />
                </div>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => duplicarCampo(secaoIndex, campoIndex)}
              >
                <Copy className="size-4" />
                <span className="sr-only">Duplicar campo</span>
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => removeCampo(secaoIndex, campoIndex)}
                disabled={secao.campos.length === 1}
              >
                <Trash2 className="size-4 text-destructive" />
                <span className="sr-only">Remover campo</span>
              </Button>
            </div>

            <label
              onClick={(e) => {
                e.preventDefault();
                updateCampo(secaoIndex, campoIndex, {
                  repetivel: !campo.repetivel,
                });
              }}
              className="flex min-h-8 cursor-pointer items-center gap-2 text-xs text-muted-foreground select-none"
            >
              <Checkbox
                checked={campo.repetivel}
                tabIndex={-1}
                className="pointer-events-none"
              />
              Permitir múltiplas entradas deste campo (ex: um por membro)
            </label>

            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs text-muted-foreground">
                  Colunas
                </Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => addColuna(secaoIndex, campoIndex)}
                >
                  <Plus className="size-3.5" />
                  Adicionar coluna
                </Button>
              </div>

              {campo.colunas.map((coluna, colunaIndex) => (
                <div
                  key={colunaIndex}
                  className="flex flex-col gap-2 rounded-lg border border-input bg-background p-2"
                >
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                    <GripVertical className="hidden size-3.5 shrink-0 text-muted-foreground sm:block" />
                    <Input
                      className="min-w-0 sm:flex-1"
                      value={coluna.titulo}
                      onChange={(e) =>
                        updateColuna(secaoIndex, campoIndex, colunaIndex, {
                          titulo: e.target.value,
                        })
                      }
                      placeholder="Ex: Nome do membro"
                      required
                    />
                    <div className="flex items-center gap-2">
                      <select
                        className={
                          selectClassName() +
                          " min-w-0 flex-1 sm:w-40 sm:flex-none"
                        }
                        value={coluna.tipo}
                        onChange={(e) => {
                          const tipo = e.target.value as TipoColuna;
                          updateColuna(secaoIndex, campoIndex, colunaIndex, {
                            tipo,
                            opcoes:
                              tipo === "MULTIPLA_ESCOLHA" &&
                              coluna.opcoes.length < 2
                                ? ["", ""]
                                : coluna.opcoes,
                          });
                        }}
                      >
                        {Object.entries(TIPO_COLUNA_LABELS).map(
                          ([value, label]) => (
                            <option key={value} value={value}>
                              {label}
                            </option>
                          ),
                        )}
                      </select>
                      {(coluna.tipo === "NUMERO" ||
                        coluna.tipo === "TEXTO") && (
                        <Input
                          className="min-w-0 flex-1 sm:w-32 sm:flex-none"
                          value={coluna.formatacao}
                          onChange={(e) =>
                            updateColuna(
                              secaoIndex,
                              campoIndex,
                              colunaIndex,
                              {
                                formatacao: e.target.value,
                              },
                            )
                          }
                          placeholder="Ex: kg, cm"
                        />
                      )}
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="shrink-0"
                        onClick={() =>
                          duplicarColuna(secaoIndex, campoIndex, colunaIndex)
                        }
                      >
                        <Copy className="size-3.5" />
                        <span className="sr-only">Duplicar coluna</span>
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="shrink-0"
                        onClick={() =>
                          removeColuna(secaoIndex, campoIndex, colunaIndex)
                        }
                        disabled={campo.colunas.length === 1}
                      >
                        <Trash2 className="size-3.5 text-destructive" />
                        <span className="sr-only">Remover coluna</span>
                      </Button>
                    </div>
                  </div>

                  {coluna.tipo === "MULTIPLA_ESCOLHA" && (
                    <div className="flex flex-col gap-2 pl-0 sm:pl-6">
                      <label
                        onClick={(e) => {
                          e.preventDefault();
                          updateColuna(secaoIndex, campoIndex, colunaIndex, {
                            multiplaSelecao: !coluna.multiplaSelecao,
                          });
                        }}
                        className="flex min-h-8 cursor-pointer items-center gap-2 text-xs text-muted-foreground select-none"
                      >
                        <Checkbox
                          checked={coluna.multiplaSelecao}
                          tabIndex={-1}
                          className="pointer-events-none"
                        />
                        Permitir selecionar mais de uma opção
                      </label>
                      <Label className="text-xs text-muted-foreground">
                        Opções
                      </Label>
                      {coluna.opcoes.map((opcao, opcaoIndex) => (
                        <div
                          key={opcaoIndex}
                          className="flex items-center gap-2"
                        >
                          <Input
                            className="min-w-0 flex-1"
                            value={opcao}
                            onChange={(e) =>
                              updateOpcao(
                                secaoIndex,
                                campoIndex,
                                colunaIndex,
                                opcaoIndex,
                                e.target.value,
                              )
                            }
                            placeholder={`Opção ${opcaoIndex + 1}`}
                            required
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="shrink-0"
                            onClick={() =>
                              removeOpcao(
                                secaoIndex,
                                campoIndex,
                                colunaIndex,
                                opcaoIndex,
                              )
                            }
                            disabled={coluna.opcoes.length <= 2}
                          >
                            <Trash2 className="size-3.5 text-destructive" />
                            <span className="sr-only">Remover opção</span>
                          </Button>
                        </div>
                      ))}
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="w-fit"
                        onClick={() =>
                          addOpcao(secaoIndex, campoIndex, colunaIndex)
                        }
                      >
                        <Plus className="size-3.5" />
                        Adicionar opção
                      </Button>
                    </div>
                  )}

                  {coluna.tipo === "NUMERO" && (
                    <div className="flex flex-col gap-2 pl-0 sm:flex-row sm:items-center sm:pl-6">
                      <div className="flex-1">
                        <Label className="text-xs text-muted-foreground">
                          Valor ideal (opcional, usado no relatório comparativo)
                        </Label>
                        <Input
                          value={coluna.valorIdeal}
                          onChange={(e) =>
                            updateColuna(secaoIndex, campoIndex, colunaIndex, {
                              valorIdeal: e.target.value,
                            })
                          }
                          placeholder="Ex: 120 ou 90-120"
                        />
                      </div>
                      <div className="sm:w-56">
                        <Label className="text-xs text-muted-foreground">
                          Direção
                        </Label>
                        <select
                          className={selectClassName()}
                          value={coluna.direcaoIdeal}
                          onChange={(e) =>
                            updateColuna(secaoIndex, campoIndex, colunaIndex, {
                              direcaoIdeal: e.target.value as DirecaoIdeal,
                            })
                          }
                        >
                          {Object.entries(DIRECAO_IDEAL_LABELS).map(
                            ([value, label]) => (
                              <option key={value} value={value}>
                                {label}
                              </option>
                            ),
                          )}
                        </select>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}

      <Button
        type="button"
        variant="outline"
        size="sm"
        className="w-fit"
        onClick={() => addCampo(secaoIndex)}
      >
        <Plus />
        Adicionar campo
      </Button>
    </CardContent>
  );

  const cabecalho = (
    <CardHeader className="flex flex-row items-start justify-between gap-2">
      <div className="flex-1">
        <div className="flex flex-col gap-1.5">
          <Label>Nome</Label>
          <Input
            value={secao.nome}
            onChange={(e) =>
              updateSecao(secaoIndex, { nome: e.target.value })
            }
            placeholder="Ex: Membros Superiores"
            required
          />
        </div>
      </div>
      <div className="flex items-center gap-1">
        {permitirRetrair && (
          <CollapsibleTrigger asChild>
            <Button type="button" variant="ghost" size="icon">
              <ChevronDown
                className={cn(
                  "size-4 transition-transform",
                  retraida && "-rotate-90",
                )}
              />
              <span className="sr-only">
                {retraida ? "Expandir seção" : "Retrair seção"}
              </span>
            </Button>
          </CollapsibleTrigger>
        )}
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => duplicarSecao(secaoIndex)}
        >
          <Copy className="size-4" />
          <span className="sr-only">Duplicar seção</span>
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => removeSecao(secaoIndex)}
          disabled={totalSecoes === 1}
        >
          <Trash2 className="size-4 text-destructive" />
          <span className="sr-only">Remover seção</span>
        </Button>
      </div>
    </CardHeader>
  );

  const card = permitirRetrair ? (
    <Card className="flex-1 border-dashed">
      <Collapsible open={aberta} onOpenChange={onToggleRetraida}>
        {cabecalho}
        <CollapsibleContent>{conteudoCampos}</CollapsibleContent>
      </Collapsible>
    </Card>
  ) : (
    <Card className="flex-1 border-dashed">
      {cabecalho}
      {conteudoCampos}
    </Card>
  );

  if (!arrastavel) {
    return card;
  }

  return (
    <div
      className="flex items-start gap-2"
      onDragOver={onDragOver}
      onDrop={onDrop}
    >
      <button
        type="button"
        draggable
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
        className="mt-6 cursor-grab text-muted-foreground active:cursor-grabbing"
        aria-label="Arrastar para reordenar seção"
      >
        <GripVertical className="size-4" />
      </button>
      {card}
    </div>
  );
}

export function ExameForm({
  action,
  defaultValues,
  mode,
}: {
  action: (
    prevState: ExameActionState,
    formData: FormData,
  ) => Promise<ExameActionState>;
  defaultValues?: {
    nome: string;
    descricao: string;
    secoes: SecaoDraft[];
  };
  mode: "create" | "edit";
}) {
  const router = useRouter();
  const [state, formAction] = useActionState(action, initialState);
  const [nomeExame, setNomeExame] = useState(defaultValues?.nome ?? "");
  const [secoes, setSecoes] = useState<SecaoDraft[]>(
    defaultValues?.secoes && defaultValues.secoes.length > 0
      ? defaultValues.secoes
      : [novaSecao()],
  );
  const [secoesRetraidas, setSecoesRetraidas] = useState<Set<number>>(
    () =>
      new Set(
        defaultValues?.secoes && defaultValues.secoes.length > 0
          ? defaultValues.secoes.map((_, i) => i)
          : [],
      ),
  );
  const [secaoArrastada, setSecaoArrastada] = useState<number | null>(null);
  const [passoAtual, setPassoAtual] = useState(0);

  function toggleSecaoRetraida(index: number) {
    setSecoesRetraidas((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  }

  useEffect(() => {
    if (state.success) {
      toast.success(
        mode === "create"
          ? "Exame criado com sucesso."
          : "Exame atualizado com sucesso.",
      );
      router.push("/exames");
    }
  }, [state.success, mode, router]);

  function updateSecao(index: number, patch: Partial<SecaoDraft>) {
    setSecoes((prev) =>
      prev.map((secao, i) => (i === index ? { ...secao, ...patch } : secao)),
    );
  }

  function addSecao() {
    setSecoesRetraidas(new Set(secoes.map((_, i) => i)));
    setPassoAtual(secoes.length);
    setSecoes((prev) => [...prev, novaSecao()]);
  }

  function removeSecao(index: number) {
    setSecoes((prev) => prev.filter((_, i) => i !== index));
    setSecoesRetraidas((prev) => {
      const next = new Set<number>();
      prev.forEach((i) => {
        if (i < index) next.add(i);
        else if (i > index) next.add(i - 1);
      });
      return next;
    });
    setPassoAtual((p) => Math.max(0, Math.min(p, secoes.length - 2)));
  }

  function duplicarSecao(index: number) {
    setSecoes((prev) => {
      const copia = structuredClone(prev[index]);
      return [...prev.slice(0, index + 1), copia, ...prev.slice(index + 1)];
    });
    const next = new Set<number>();
    for (let i = 0; i < secoes.length + 1; i++) {
      if (i !== index + 1) next.add(i);
    }
    setSecoesRetraidas(next);
    setPassoAtual(index + 1);
  }

  function moverSecaoPara(origem: number, destino: number) {
    setSecoes((prev) => {
      if (
        origem === destino ||
        origem < 0 ||
        destino < 0 ||
        origem >= prev.length ||
        destino >= prev.length
      ) {
        return prev;
      }
      const copia = [...prev];
      const [removida] = copia.splice(origem, 1);
      copia.splice(destino, 0, removida);
      return copia;
    });
  }

  function updateCampo(
    secaoIndex: number,
    campoIndex: number,
    patch: Partial<CampoDraft>,
  ) {
    setSecoes((prev) =>
      prev.map((secao, si) =>
        si !== secaoIndex
          ? secao
          : {
              ...secao,
              campos: secao.campos.map((campo, ci) =>
                ci === campoIndex ? { ...campo, ...patch } : campo,
              ),
            },
      ),
    );
  }

  function addCampo(secaoIndex: number) {
    setSecoes((prev) =>
      prev.map((secao, si) =>
        si !== secaoIndex
          ? secao
          : { ...secao, campos: [...secao.campos, novoCampo()] },
      ),
    );
  }

  function removeCampo(secaoIndex: number, campoIndex: number) {
    setSecoes((prev) =>
      prev.map((secao, si) =>
        si !== secaoIndex
          ? secao
          : {
              ...secao,
              campos: secao.campos.filter((_, ci) => ci !== campoIndex),
            },
      ),
    );
  }

  function duplicarCampo(secaoIndex: number, campoIndex: number) {
    setSecoes((prev) =>
      prev.map((secao, si) => {
        if (si !== secaoIndex) return secao;
        const copia = structuredClone(secao.campos[campoIndex]);
        return {
          ...secao,
          campos: [
            ...secao.campos.slice(0, campoIndex + 1),
            copia,
            ...secao.campos.slice(campoIndex + 1),
          ],
        };
      }),
    );
  }

  function updateColuna(
    secaoIndex: number,
    campoIndex: number,
    colunaIndex: number,
    patch: Partial<ColunaDraft>,
  ) {
    setSecoes((prev) =>
      prev.map((secao, si) =>
        si !== secaoIndex
          ? secao
          : {
              ...secao,
              campos: secao.campos.map((campo, ci) =>
                ci !== campoIndex
                  ? campo
                  : {
                      ...campo,
                      colunas: campo.colunas.map((coluna, coi) =>
                        coi === colunaIndex
                          ? { ...coluna, ...patch }
                          : coluna,
                      ),
                    },
              ),
            },
      ),
    );
  }

  function addColuna(secaoIndex: number, campoIndex: number) {
    setSecoes((prev) =>
      prev.map((secao, si) =>
        si !== secaoIndex
          ? secao
          : {
              ...secao,
              campos: secao.campos.map((campo, ci) =>
                ci !== campoIndex
                  ? campo
                  : { ...campo, colunas: [...campo.colunas, novaColuna()] },
              ),
            },
      ),
    );
  }

  function removeColuna(
    secaoIndex: number,
    campoIndex: number,
    colunaIndex: number,
  ) {
    setSecoes((prev) =>
      prev.map((secao, si) =>
        si !== secaoIndex
          ? secao
          : {
              ...secao,
              campos: secao.campos.map((campo, ci) =>
                ci !== campoIndex
                  ? campo
                  : {
                      ...campo,
                      colunas: campo.colunas.filter(
                        (_, coi) => coi !== colunaIndex,
                      ),
                    },
              ),
            },
      ),
    );
  }

  function duplicarColuna(
    secaoIndex: number,
    campoIndex: number,
    colunaIndex: number,
  ) {
    setSecoes((prev) =>
      prev.map((secao, si) =>
        si !== secaoIndex
          ? secao
          : {
              ...secao,
              campos: secao.campos.map((campo, ci) => {
                if (ci !== campoIndex) return campo;
                const copia = structuredClone(campo.colunas[colunaIndex]);
                return {
                  ...campo,
                  colunas: [
                    ...campo.colunas.slice(0, colunaIndex + 1),
                    copia,
                    ...campo.colunas.slice(colunaIndex + 1),
                  ],
                };
              }),
            },
      ),
    );
  }

  function updateOpcao(
    secaoIndex: number,
    campoIndex: number,
    colunaIndex: number,
    opcaoIndex: number,
    value: string,
  ) {
    setSecoes((prev) =>
      prev.map((secao, si) =>
        si !== secaoIndex
          ? secao
          : {
              ...secao,
              campos: secao.campos.map((campo, ci) =>
                ci !== campoIndex
                  ? campo
                  : {
                      ...campo,
                      colunas: campo.colunas.map((coluna, coi) =>
                        coi !== colunaIndex
                          ? coluna
                          : {
                              ...coluna,
                              opcoes: coluna.opcoes.map((opcao, oi) =>
                                oi === opcaoIndex ? value : opcao,
                              ),
                            },
                      ),
                    },
              ),
            },
      ),
    );
  }

  function addOpcao(
    secaoIndex: number,
    campoIndex: number,
    colunaIndex: number,
  ) {
    setSecoes((prev) =>
      prev.map((secao, si) =>
        si !== secaoIndex
          ? secao
          : {
              ...secao,
              campos: secao.campos.map((campo, ci) =>
                ci !== campoIndex
                  ? campo
                  : {
                      ...campo,
                      colunas: campo.colunas.map((coluna, coi) =>
                        coi !== colunaIndex
                          ? coluna
                          : { ...coluna, opcoes: [...coluna.opcoes, ""] },
                      ),
                    },
              ),
            },
      ),
    );
  }

  function removeOpcao(
    secaoIndex: number,
    campoIndex: number,
    colunaIndex: number,
    opcaoIndex: number,
  ) {
    setSecoes((prev) =>
      prev.map((secao, si) =>
        si !== secaoIndex
          ? secao
          : {
              ...secao,
              campos: secao.campos.map((campo, ci) =>
                ci !== campoIndex
                  ? campo
                  : {
                      ...campo,
                      colunas: campo.colunas.map((coluna, coi) =>
                        coi !== colunaIndex
                          ? coluna
                          : {
                              ...coluna,
                              opcoes: coluna.opcoes.filter(
                                (_, oi) => oi !== opcaoIndex,
                              ),
                            },
                      ),
                    },
              ),
            },
      ),
    );
  }

  const passoClamped = Math.min(passoAtual, secoes.length - 1);
  const secaoAtualMobile = secoes[passoClamped];

  const secaoCardHandlers = {
    updateSecao,
    duplicarSecao,
    removeSecao,
    updateCampo,
    addCampo,
    removeCampo,
    duplicarCampo,
    updateColuna,
    addColuna,
    removeColuna,
    duplicarColuna,
    updateOpcao,
    addOpcao,
    removeOpcao,
  };

  return (
    <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
    <form
      action={formAction}
      className="flex max-w-3xl flex-1 flex-col gap-6 pb-24 md:pb-0"
    >
      <input type="hidden" name="secoes" value={JSON.stringify(secoes)} />

      <div className="flex flex-col gap-2">
        <Label htmlFor="nome">Nome do exame</Label>
        <Input
          id="nome"
          name="nome"
          value={nomeExame}
          onChange={(e) => setNomeExame(e.target.value)}
          placeholder="Ex: Avaliação Postural"
          required
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="descricao">Descrição</Label>
        <Textarea
          id="descricao"
          name="descricao"
          defaultValue={defaultValues?.descricao}
          placeholder="Descrição opcional do exame"
        />
      </div>

      {/* Mobile: uma seção por vez, como um passo-a-passo */}
      <div className="flex flex-col gap-4 md:hidden">
        <div className="flex items-center justify-between">
          <Label>Seções</Label>
          <Button type="button" variant="outline" size="sm" onClick={addSecao}>
            <Plus />
            Adicionar seção
          </Button>
        </div>

        {secoes.length > 1 && (
          <p className="text-center text-xs font-medium text-muted-foreground">
            Seção {passoClamped + 1} de {secoes.length}
          </p>
        )}

        {secaoAtualMobile && (
          <SecaoCard
            secao={secaoAtualMobile}
            secaoIndex={passoClamped}
            totalSecoes={secoes.length}
            permitirRetrair={false}
            retraida={false}
            onToggleRetraida={() => {}}
            arrastavel={false}
            {...secaoCardHandlers}
          />
        )}

        {secoes.length > 1 && (
          <div className="flex items-center justify-between gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setPassoAtual((p) => Math.max(0, p - 1))}
              disabled={passoClamped === 0}
            >
              <ChevronLeft />
              Anterior
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() =>
                setPassoAtual((p) => Math.min(secoes.length - 1, p + 1))
              }
              disabled={passoClamped === secoes.length - 1}
            >
              Próxima
              <ChevronRight />
            </Button>
          </div>
        )}
      </div>

      {/* Desktop: todas as seções visíveis, reordenáveis por drag */}
      <div className="hidden flex-col gap-4 md:flex">
        <div className="flex items-center justify-between">
          <Label>Seções</Label>
          <Button type="button" variant="outline" size="sm" onClick={addSecao}>
            <Plus />
            Adicionar seção
          </Button>
        </div>

        {secoes.map((secao, secaoIndex) => (
          <SecaoCard
            key={secaoIndex}
            secao={secao}
            secaoIndex={secaoIndex}
            totalSecoes={secoes.length}
            permitirRetrair
            retraida={secoesRetraidas.has(secaoIndex)}
            onToggleRetraida={() => toggleSecaoRetraida(secaoIndex)}
            arrastavel
            onDragStart={() => setSecaoArrastada(secaoIndex)}
            onDragEnd={() => setSecaoArrastada(null)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => {
              if (secaoArrastada !== null) {
                moverSecaoPara(secaoArrastada, secaoIndex);
              }
              setSecaoArrastada(null);
            }}
            {...secaoCardHandlers}
          />
        ))}
      </div>

      {state.error && (
        <p className="text-sm text-destructive">{state.error}</p>
      )}

      {/* Desktop: botões inline */}
      <div className="hidden gap-2 md:flex">
        <SubmitButton
          label={mode === "create" ? "Criar exame" : "Salvar alterações"}
        />
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push("/exames")}
        >
          Cancelar
        </Button>
      </div>

      {/* Mobile: botão flutuante sempre acessível */}
      <div className="fixed inset-x-0 bottom-0 z-20 flex gap-2 border-t bg-background/95 p-3 backdrop-blur-sm md:hidden">
        <SubmitButton
          label={mode === "create" ? "Criar exame" : "Salvar alterações"}
          className="flex-1"
        />
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push("/exames")}
        >
          Cancelar
        </Button>
      </div>
    </form>

    <aside className="hidden lg:sticky lg:top-6 lg:block lg:w-96 lg:shrink-0">
      <ExamePreview nome={nomeExame} secoes={secoes} />
    </aside>
    </div>
  );
}

function ExamePreview({ nome, secoes }: { nome: string; secoes: SecaoDraft[] }) {
  return (
    <Card>
      <CardHeader>
        <p className="text-xs font-medium text-muted-foreground">Preview</p>
        <p className="text-lg font-semibold">{nome || "Nome do exame"}</p>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {secoes.map((secao, secaoIndex) => (
          <div key={secaoIndex} className="flex flex-col gap-3">
            <p className="text-sm font-semibold">
              {secao.nome || "Nome da seção"}
            </p>
            {secao.campos.map((campo, campoIndex) => (
              <div key={campoIndex} className="flex flex-col gap-2 pl-2">
                {(campo.nome || campo.repetivel) && (
                  <p className="text-xs font-medium text-muted-foreground">
                    {campo.nome}
                    {campo.repetivel && (
                      <span className="ml-1 text-muted-foreground/70">
                        (repetível)
                      </span>
                    )}
                  </p>
                )}
                <div className="flex flex-col gap-2">
                  {campo.colunas.map((coluna, colunaIndex) => (
                    <div key={colunaIndex} className="flex flex-col gap-1">
                      <Label className="text-xs text-muted-foreground">
                        {coluna.titulo || "Título da coluna"}
                        {coluna.formatacao ? ` (${coluna.formatacao})` : ""}
                      </Label>

                      {coluna.tipo === "MULTIPLA_ESCOLHA" ? (
                        <div className="flex flex-col gap-1 rounded-lg border border-input p-2">
                          {coluna.opcoes.length === 0 && (
                            <span className="text-xs text-muted-foreground">
                              Nenhuma opção adicionada
                            </span>
                          )}
                          {coluna.opcoes.map((opcao, opcaoIndex) => (
                            <label
                              key={opcaoIndex}
                              className="flex items-center gap-2 text-xs"
                            >
                              {coluna.multiplaSelecao ? (
                                <Checkbox disabled />
                              ) : (
                                <input
                                  type="radio"
                                  disabled
                                  className="size-3.5"
                                />
                              )}
                              {opcao || `Opção ${opcaoIndex + 1}`}
                            </label>
                          ))}
                        </div>
                      ) : coluna.tipo === "SIM_NAO" ? (
                        <select
                          disabled
                          className={selectClassName() + " opacity-70"}
                        >
                          <option>Selecione</option>
                        </select>
                      ) : coluna.tipo === "GONIOMETRIA" ? (
                        <div className="rounded-lg border border-input p-2 text-xs text-muted-foreground">
                          Multisseleção de movimentos (Biblioteca de
                          Movimento)
                        </div>
                      ) : (
                        <Input
                          disabled
                          type={coluna.tipo === "NUMERO" ? "number" : "text"}
                          placeholder={
                            coluna.tipo === "NUMERO" ? "0" : "Resposta"
                          }
                        />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
