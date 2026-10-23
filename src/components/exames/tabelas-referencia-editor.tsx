"use client";

import { createContext, useContext, useId } from "react";
import { Copy, Plus, Table2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { normalizarTitulo, VARIAVEIS_PACIENTE, type VariavelExame } from "@/lib/exame-formula";
import {
  nomeVariavelTabela,
  type LinhaTabela,
  type TabelaReferencia,
} from "@/lib/tabela-referencia";

/** Variáveis `{Tabela.Saída}` geradas pelas tabelas — o editor de fórmula as
 * oferece no autocomplete e não as trata como referência inexistente. */
export const VariaveisTabelasContext = createContext<VariavelExame[]>([]);

export function useVariaveisTabelas(): VariavelExame[] {
  return useContext(VariaveisTabelasContext);
}

const selectClassName =
  "h-8 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1 text-base transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 md:text-sm dark:bg-input/30";

function novaLinha(chaves: number, saidas: number): LinhaTabela {
  return {
    faixas: Array.from({ length: chaves }, () => ({ min: "", max: "" })),
    valores: Array.from({ length: saidas }, () => ""),
  };
}

function novaTabela(numero: number): TabelaReferencia {
  return {
    nome: `Tabela ${numero}`,
    chaves: ["Idade"],
    saidas: ["Valor"],
    linhas: [novaLinha(1, 1)],
  };
}

export function TabelasReferenciaEditor({
  tabelas,
  onChange,
  colunasNumericas,
  onRenomearReferencia,
}: {
  tabelas: TabelaReferencia[];
  onChange: (tabelas: TabelaReferencia[]) => void;
  /** Títulos das colunas numéricas/calculadas do exame, sugeridos como chave de busca. */
  colunasNumericas: string[];
  /** Propaga `{Tabela.Saída}` renomeada para as fórmulas/condições do exame. */
  onRenomearReferencia: (antigo: string, novo: string) => void;
}) {
  const idBase = useId();
  const sugestoesChave = [...VARIAVEIS_PACIENTE, ...colunasNumericas];

  function atualizar(index: number, patch: Partial<TabelaReferencia>) {
    onChange(tabelas.map((t, i) => (i === index ? { ...t, ...patch } : t)));
  }

  function adicionarTabela() {
    let n = tabelas.length + 1;
    while (tabelas.some((t) => normalizarTitulo(t.nome) === `tabela ${n}`)) n++;
    onChange([...tabelas, novaTabela(n)]);
  }

  function renomearTabela(index: number, nome: string) {
    const tabela = tabelas[index];
    atualizar(index, { nome });
    if (tabela.nome.trim() && nome.trim() && normalizarTitulo(tabela.nome) !== normalizarTitulo(nome)) {
      for (const saida of tabela.saidas) {
        if (!saida.trim()) continue;
        onRenomearReferencia(nomeVariavelTabela(tabela.nome, saida), nomeVariavelTabela(nome, saida));
      }
    }
  }

  function renomearSaida(index: number, saidaIndex: number, nome: string) {
    const tabela = tabelas[index];
    const antiga = tabela.saidas[saidaIndex];
    atualizar(index, { saidas: tabela.saidas.map((s, i) => (i === saidaIndex ? nome : s)) });
    if (tabela.nome.trim() && antiga.trim() && nome.trim() && normalizarTitulo(antiga) !== normalizarTitulo(nome)) {
      onRenomearReferencia(nomeVariavelTabela(tabela.nome, antiga), nomeVariavelTabela(tabela.nome, nome));
    }
  }

  function adicionarChave(index: number) {
    const t = tabelas[index];
    atualizar(index, {
      chaves: [...t.chaves, ""],
      linhas: t.linhas.map((l) => ({ ...l, faixas: [...l.faixas, { min: "", max: "" }] })),
    });
  }

  function removerChave(index: number, chaveIndex: number) {
    const t = tabelas[index];
    atualizar(index, {
      chaves: t.chaves.filter((_, i) => i !== chaveIndex),
      linhas: t.linhas.map((l) => ({ ...l, faixas: l.faixas.filter((_, i) => i !== chaveIndex) })),
    });
  }

  function adicionarSaida(index: number) {
    const t = tabelas[index];
    atualizar(index, {
      saidas: [...t.saidas, ""],
      linhas: t.linhas.map((l) => ({ ...l, valores: [...l.valores, ""] })),
    });
  }

  function removerSaida(index: number, saidaIndex: number) {
    const t = tabelas[index];
    atualizar(index, {
      saidas: t.saidas.filter((_, i) => i !== saidaIndex),
      linhas: t.linhas.map((l) => ({ ...l, valores: l.valores.filter((_, i) => i !== saidaIndex) })),
    });
  }

  function atualizarLinha(index: number, linhaIndex: number, linha: LinhaTabela) {
    const t = tabelas[index];
    atualizar(index, { linhas: t.linhas.map((l, i) => (i === linhaIndex ? linha : l)) });
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-xs text-muted-foreground">
        Uma tabela devolve valores conforme faixas de busca (ex: sexo e idade). A
        primeira linha em que todas as faixas batem vale; deixe &quot;de&quot; ou
        &quot;até&quot; vazio para faixa aberta. Cada resultado vira uma variável{" "}
        <code className="font-mono">{"{Tabela.Resultado}"}</code> para usar em
        qualquer fórmula ou condição do exame. Paciente fora de todas as faixas
        mostra erro no campo que usa a tabela.
      </p>

      {tabelas.length === 0 && (
        <p className="rounded-lg border border-dashed p-3 text-xs text-muted-foreground">
          Nenhuma tabela criada ainda.
        </p>
      )}

      {tabelas.map((tabela, index) => {
        const id = `${idBase}-${index}`;
        return (
          <div
            key={index}
            id={`tabela-ref-${index}`}
            className="flex flex-col gap-4 rounded-xl border bg-card p-3 transition-shadow"
          >
            <div className="flex items-end gap-2">
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <Label htmlFor={`${id}-nome`} className="text-xs">
                  Nome da tabela
                </Label>
                <Input
                  id={`${id}-nome`}
                  value={tabela.nome}
                  onChange={(e) => renomearTabela(index, e.target.value)}
                  placeholder="Ex: Flexibilidade"
                />
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label={`Remover tabela ${tabela.nome}`}
                onClick={() => onChange(tabelas.filter((_, i) => i !== index))}
              >
                <Trash2 />
              </Button>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="flex flex-col gap-2">
                <p className="text-xs font-medium">Chaves de busca</p>
                {tabela.chaves.map((chave, chaveIndex) => (
                  <div key={chaveIndex} className="flex items-end gap-2">
                    <div className="flex min-w-0 flex-1 flex-col gap-1">
                      <Label htmlFor={`${id}-chave-${chaveIndex}`} className="text-xs text-muted-foreground">
                        Chave {chaveIndex + 1}
                      </Label>
                      <Input
                        id={`${id}-chave-${chaveIndex}`}
                        list={`${idBase}-sugestoes`}
                        value={chave}
                        onChange={(e) =>
                          atualizar(index, {
                            chaves: tabela.chaves.map((c, i) => (i === chaveIndex ? e.target.value : c)),
                          })
                        }
                        placeholder="Ex: Idade"
                      />
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label={`Remover chave ${chave || chaveIndex + 1}`}
                      disabled={tabela.chaves.length === 1}
                      onClick={() => removerChave(index, chaveIndex)}
                    >
                      <Trash2 />
                    </Button>
                  </div>
                ))}
                <Button type="button" variant="outline" size="sm" className="self-start" onClick={() => adicionarChave(index)}>
                  <Plus />
                  Adicionar chave
                </Button>
              </div>

              <div className="flex flex-col gap-2">
                <p className="text-xs font-medium">Resultados</p>
                {tabela.saidas.map((saida, saidaIndex) => (
                  <div key={saidaIndex} className="flex items-end gap-2">
                    <div className="flex min-w-0 flex-1 flex-col gap-1">
                      <Label htmlFor={`${id}-saida-${saidaIndex}`} className="text-xs text-muted-foreground">
                        Resultado {saidaIndex + 1}
                      </Label>
                      <Input
                        id={`${id}-saida-${saidaIndex}`}
                        value={saida}
                        onChange={(e) => renomearSaida(index, saidaIndex, e.target.value)}
                        placeholder="Ex: Fraco até"
                      />
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label={`Remover resultado ${saida || saidaIndex + 1}`}
                      disabled={tabela.saidas.length === 1}
                      onClick={() => removerSaida(index, saidaIndex)}
                    >
                      <Trash2 />
                    </Button>
                  </div>
                ))}
                <Button type="button" variant="outline" size="sm" className="self-start" onClick={() => adicionarSaida(index)}>
                  <Plus />
                  Adicionar resultado
                </Button>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <p className="text-xs font-medium">Linhas</p>
              {tabela.linhas.map((linha, linhaIndex) => (
                <div key={linhaIndex} className="flex flex-col gap-3 rounded-lg border bg-background p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-muted-foreground">Linha {linhaIndex + 1}</span>
                    <div className="flex gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        aria-label={`Duplicar linha ${linhaIndex + 1}`}
                        onClick={() =>
                          atualizar(index, {
                            linhas: [
                              ...tabela.linhas.slice(0, linhaIndex + 1),
                              structuredClone(linha),
                              ...tabela.linhas.slice(linhaIndex + 1),
                            ],
                          })
                        }
                      >
                        <Copy />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        aria-label={`Remover linha ${linhaIndex + 1}`}
                        disabled={tabela.linhas.length === 1}
                        onClick={() => atualizar(index, { linhas: tabela.linhas.filter((_, i) => i !== linhaIndex) })}
                      >
                        <Trash2 />
                      </Button>
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {tabela.chaves.map((chave, chaveIndex) => {
                      const faixa = linha.faixas[chaveIndex] ?? { min: "", max: "" };
                      const campoId = `${id}-l${linhaIndex}-c${chaveIndex}`;
                      const rotulo = chave.trim() || `Chave ${chaveIndex + 1}`;
                      const mudarFaixa = (patch: Partial<typeof faixa>) =>
                        atualizarLinha(index, linhaIndex, {
                          ...linha,
                          faixas: tabela.chaves.map((_, i) =>
                            i === chaveIndex ? { ...faixa, ...patch } : (linha.faixas[i] ?? { min: "", max: "" }),
                          ),
                        });

                      if (normalizarTitulo(chave) === "sexo") {
                        const valor = faixa.min === faixa.max && (faixa.min === "1" || faixa.min === "0") ? faixa.min : "";
                        return (
                          <div key={chaveIndex} className="flex flex-col gap-1">
                            <Label htmlFor={campoId} className="text-xs">
                              {rotulo}
                            </Label>
                            <select
                              id={campoId}
                              className={selectClassName}
                              value={valor}
                              onChange={(e) => mudarFaixa({ min: e.target.value, max: e.target.value })}
                            >
                              <option value="">Qualquer</option>
                              <option value="1">Masculino</option>
                              <option value="0">Feminino</option>
                            </select>
                          </div>
                        );
                      }

                      return (
                        <div key={chaveIndex} className="grid grid-cols-2 gap-2">
                          <div className="flex flex-col gap-1">
                            <Label htmlFor={`${campoId}-min`} className="text-xs">
                              {rotulo} de
                            </Label>
                            <Input
                              id={`${campoId}-min`}
                              inputMode="decimal"
                              value={faixa.min}
                              onChange={(e) => mudarFaixa({ min: e.target.value })}
                              placeholder="aberto"
                            />
                          </div>
                          <div className="flex flex-col gap-1">
                            <Label htmlFor={`${campoId}-max`} className="text-xs">
                              {rotulo} até
                            </Label>
                            <Input
                              id={`${campoId}-max`}
                              inputMode="decimal"
                              value={faixa.max}
                              onChange={(e) => mudarFaixa({ max: e.target.value })}
                              placeholder="aberto"
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="grid gap-3 border-t pt-3 sm:grid-cols-2 lg:grid-cols-3">
                    {tabela.saidas.map((saida, saidaIndex) => {
                      const campoId = `${id}-l${linhaIndex}-s${saidaIndex}`;
                      return (
                        <div key={saidaIndex} className="flex flex-col gap-1">
                          <Label htmlFor={campoId} className="text-xs">
                            {saida.trim() || `Resultado ${saidaIndex + 1}`}
                          </Label>
                          <Input
                            id={campoId}
                            inputMode="decimal"
                            value={linha.valores[saidaIndex] ?? ""}
                            onChange={(e) =>
                              atualizarLinha(index, linhaIndex, {
                                ...linha,
                                valores: tabela.saidas.map((_, i) =>
                                  i === saidaIndex ? e.target.value : (linha.valores[i] ?? ""),
                                ),
                              })
                            }
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="self-start"
                onClick={() =>
                  atualizar(index, {
                    linhas: [...tabela.linhas, novaLinha(tabela.chaves.length, tabela.saidas.length)],
                  })
                }
              >
                <Plus />
                Adicionar linha
              </Button>
            </div>

            {tabela.nome.trim() && tabela.saidas.some((s) => s.trim()) && (
              <p className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                <Table2 className="size-3.5" />
                Use nas fórmulas:
                {tabela.saidas
                  .filter((s) => s.trim())
                  .map((s) => (
                    <code key={s} className="rounded bg-violet-500/10 px-1.5 py-0.5 font-mono text-violet-700 dark:text-violet-300">
                      {`{${nomeVariavelTabela(tabela.nome, s)}}`}
                    </code>
                  ))}
              </p>
            )}
          </div>
        );
      })}

      <datalist id={`${idBase}-sugestoes`}>
        {sugestoesChave.map((nome) => (
          <option key={nome} value={nome} />
        ))}
      </datalist>

      <Button type="button" variant="outline" size="sm" className="self-start" onClick={adicionarTabela}>
        <Plus />
        Adicionar tabela
      </Button>
    </div>
  );
}
