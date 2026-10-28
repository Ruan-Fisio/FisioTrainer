"use client";

import { createContext, useContext, useId, useState } from "react";
import { Copy, Pencil, Plus, Table2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { novoIdLocal } from "@/lib/exame-draft";
import { normalizarTitulo, VARIAVEIS_PACIENTE, type VariavelExame } from "@/lib/exame-formula";
import {
  colarNaTabela,
  colunasDaGrade,
  escreverCelula,
  idTabela,
  lerCelula,
  nomeVariavelTabela,
  validarTabelas,
  type ColunaGrade,
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
    id: novoIdLocal(),
    nome: `Tabela ${numero}`,
    chaves: ["Idade"],
    saidas: ["Valor"],
    linhas: [novaLinha(1, 1)],
  };
}

/** Lista resumida das tabelas do exame; criar/editar abre `TabelaDialog`. */
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
  // `id: null` = tabela nova (só entra na lista ao salvar o modal). Pelo id, e
  // não pelo índice: na edição em tempo real a lista pode mudar com o modal aberto.
  const [editando, setEditando] = useState<{ id: string | null; tabela: TabelaReferencia } | null>(
    null,
  );

  function adicionarTabela() {
    let n = tabelas.length + 1;
    while (tabelas.some((t) => normalizarTitulo(t.nome) === `tabela ${n}`)) n++;
    setEditando({ id: null, tabela: novaTabela(n) });
  }

  function salvar(tabela: TabelaReferencia, renomeacoes: [string, string][]) {
    if (!editando) return;
    const id = editando.id;
    if (id === null || !tabelas.some((t) => idTabela(t) === id)) {
      // Nova — ou apagada por outra pessoa enquanto o modal estava aberto:
      // entra de novo em vez de perder o que foi preenchido.
      onChange([...tabelas, tabela]);
    } else {
      onChange(tabelas.map((t) => (idTabela(t) === id ? tabela : t)));
    }
    if (id !== null) {
      for (const [antigo, novo] of renomeacoes) onRenomearReferencia(antigo, novo);
    }
    setEditando(null);
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-xs text-muted-foreground">
        Valores que dependem de faixas (ex: limites de uma escala por sexo e
        idade). Cada resultado vira uma variável{" "}
        <code className="font-mono">{"{Tabela.Resultado}"}</code> para usar em
        qualquer fórmula ou condição do exame.
      </p>

      {tabelas.map((tabela, index) => {
        const saidas = tabela.saidas.filter((s) => s.trim());
        return (
          <div
            key={idTabela(tabela)}
            id={`tabela-ref-${index}`}
            className="flex flex-col gap-2 rounded-lg border bg-background p-3 transition-shadow"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex min-w-0 flex-col gap-0.5">
                <p className="flex items-center gap-1.5 text-sm font-medium">
                  <Table2 className="size-4 shrink-0 text-primary" />
                  <span className="truncate">{tabela.nome || "Sem nome"}</span>
                </p>
                <p className="text-xs text-muted-foreground">
                  Busca por {tabela.chaves.filter((c) => c.trim()).join(", ") || "—"} ·{" "}
                  {tabela.linhas.length} {tabela.linhas.length === 1 ? "linha" : "linhas"}
                </p>
              </div>
              <div className="flex shrink-0 gap-1">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setEditando({ id: idTabela(tabela), tabela })}
                >
                  <Pencil />
                  Editar
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`Remover tabela ${tabela.nome}`}
                  onClick={() => onChange(tabelas.filter((t) => idTabela(t) !== idTabela(tabela)))}
                >
                  <Trash2 />
                </Button>
              </div>
            </div>
            {tabela.nome.trim() && saidas.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {saidas.map((s) => (
                  <code
                    key={s}
                    className="rounded bg-violet-500/10 px-1.5 py-0.5 font-mono text-xs text-violet-700 dark:text-violet-300"
                  >
                    {`{${nomeVariavelTabela(tabela.nome, s)}}`}
                  </code>
                ))}
              </div>
            )}
          </div>
        );
      })}

      <Button type="button" variant="outline" size="sm" className="self-start" onClick={adicionarTabela}>
        <Plus />
        Adicionar tabela
      </Button>

      {editando && (
        <TabelaDialog
          tabelaInicial={editando.tabela}
          nova={editando.id === null}
          colunasNumericas={colunasNumericas}
          onSalvar={salvar}
          onFechar={() => setEditando(null)}
        />
      )}
    </div>
  );
}

function rotuloColuna(tabela: TabelaReferencia, coluna: ColunaGrade): string {
  if (coluna.tipo === "valor") return tabela.saidas[coluna.saida].trim() || `Resultado ${coluna.saida + 1}`;
  const chave = tabela.chaves[coluna.chave].trim() || `Chave ${coluna.chave + 1}`;
  if (coluna.tipo === "sexo") return chave;
  return `${chave} ${coluna.lado === "min" ? "de" : "até"}`;
}

/**
 * Modal de edição de uma tabela: nome, chaves e resultados no topo e as linhas
 * numa grade de planilha (cabeçalho = chaves "de/até" + resultados). Edita um
 * rascunho local — só vai para o exame ao salvar. Colar um bloco copiado de
 * planilha numa célula preenche a grade a partir dela (`colarNaTabela`).
 */
function TabelaDialog({
  tabelaInicial,
  nova,
  colunasNumericas,
  onSalvar,
  onFechar,
}: {
  tabelaInicial: TabelaReferencia;
  nova: boolean;
  colunasNumericas: string[];
  /** `renomeacoes`: pares `{Tabela.Saída}` antigo → novo, para propagar nas fórmulas. */
  onSalvar: (tabela: TabelaReferencia, renomeacoes: [string, string][]) => void;
  onFechar: () => void;
}) {
  const idBase = useId();
  const [tabela, setTabela] = useState<TabelaReferencia>(() => structuredClone(tabelaInicial));
  // Nome original de cada resultado (alinhado com `saidas`; null = novo) — renomear
  // propaga para as fórmulas mesmo se outro resultado for removido no meio.
  const [saidasOriginais, setSaidasOriginais] = useState<(string | null)[]>(() =>
    nova ? tabelaInicial.saidas.map(() => null) : [...tabelaInicial.saidas],
  );
  const [tentouSalvar, setTentouSalvar] = useState(false);
  const [confirmandoDescarte, setConfirmandoDescarte] = useState(false);
  const alterada = JSON.stringify(tabela) !== JSON.stringify(tabelaInicial);

  // Fechar (X, Esc, clique fora, Cancelar) com alterações pede confirmação —
  // o rascunho só vai para o exame em "Salvar tabela" e sumia sem aviso.
  function pedirFechar() {
    if (alterada) setConfirmandoDescarte(true);
    else onFechar();
  }

  const colunas = colunasDaGrade(tabela);
  const erro = validarTabelas([tabela]);
  const sugestoesChave = [...VARIAVEIS_PACIENTE, ...colunasNumericas];

  function atualizar(patch: Partial<TabelaReferencia>) {
    setTabela((t) => ({ ...t, ...patch }));
  }

  function adicionarChave() {
    setTabela((t) => ({
      ...t,
      chaves: [...t.chaves, ""],
      linhas: t.linhas.map((l) => ({ ...l, faixas: [...l.faixas, { min: "", max: "" }] })),
    }));
  }

  function removerChave(indice: number) {
    setTabela((t) => ({
      ...t,
      chaves: t.chaves.filter((_, i) => i !== indice),
      linhas: t.linhas.map((l) => ({ ...l, faixas: l.faixas.filter((_, i) => i !== indice) })),
    }));
  }

  function adicionarSaida() {
    setTabela((t) => ({
      ...t,
      saidas: [...t.saidas, ""],
      linhas: t.linhas.map((l) => ({ ...l, valores: [...l.valores, ""] })),
    }));
    setSaidasOriginais((o) => [...o, null]);
  }

  function removerSaida(indice: number) {
    setTabela((t) => ({
      ...t,
      saidas: t.saidas.filter((_, i) => i !== indice),
      linhas: t.linhas.map((l) => ({ ...l, valores: l.valores.filter((_, i) => i !== indice) })),
    }));
    setSaidasOriginais((o) => o.filter((_, i) => i !== indice));
  }

  function mudarCelula(linhaIndex: number, coluna: ColunaGrade, valor: string) {
    setTabela((t) => ({
      ...t,
      linhas: t.linhas.map((l, i) => (i === linhaIndex ? escreverCelula(l, coluna, valor) : l)),
    }));
  }

  function colar(e: React.ClipboardEvent<HTMLElement>, linhaIndex: number, colunaIndex: number) {
    const texto = e.clipboardData.getData("text/plain");
    if (!/[\t\n]/.test(texto.trim())) return; // valor simples: deixa o input colar
    e.preventDefault();
    setTabela((t) => colarNaTabela(t, linhaIndex, colunaIndex, texto));
  }

  function salvar() {
    setTentouSalvar(true);
    if (erro) return;
    const renomeacoes: [string, string][] = [];
    tabela.saidas.forEach((saida, i) => {
      const original = saidasOriginais[i];
      if (original === null || !original.trim() || !saida.trim() || !tabelaInicial.nome.trim()) return;
      const antigo = nomeVariavelTabela(tabelaInicial.nome, original);
      const novo = nomeVariavelTabela(tabela.nome, saida);
      if (normalizarTitulo(antigo) !== normalizarTitulo(novo)) renomeacoes.push([antigo, novo]);
    });
    onSalvar(tabela, renomeacoes);
  }

  return (
    <Dialog open onOpenChange={(aberto) => !aberto && pedirFechar()}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-5xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Table2 className="size-4 text-primary" />
            {nova ? "Nova tabela de referência" : "Editar tabela de referência"}
          </DialogTitle>
          <DialogDescription>
            A primeira linha em que todas as faixas batem vale. Deixe &quot;de&quot;
            ou &quot;até&quot; vazio para faixa aberta. Dá para colar linhas
            copiadas de uma planilha direto numa célula.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-1">
          <Label htmlFor={`${idBase}-nome`}>Nome da tabela</Label>
          <Input
            id={`${idBase}-nome`}
            value={tabela.nome}
            onChange={(e) => atualizar({ nome: e.target.value })}
            placeholder="Ex: Flexibilidade"
          />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <ListaNomes
            titulo="Chaves de busca"
            rotuloItem="Chave"
            placeholder="Ex: Idade"
            itens={tabela.chaves}
            listId={`${idBase}-sugestoes`}
            onMudar={(i, valor) => atualizar({ chaves: tabela.chaves.map((c, j) => (j === i ? valor : c)) })}
            onAdicionar={adicionarChave}
            onRemover={removerChave}
            rotuloAdicionar="Adicionar chave"
          />
          <ListaNomes
            titulo="Resultados"
            rotuloItem="Resultado"
            placeholder="Ex: Fraco até"
            itens={tabela.saidas}
            onMudar={(i, valor) => atualizar({ saidas: tabela.saidas.map((s, j) => (j === i ? valor : s)) })}
            onAdicionar={adicionarSaida}
            onRemover={removerSaida}
            rotuloAdicionar="Adicionar resultado"
          />
        </div>
        <datalist id={`${idBase}-sugestoes`}>
          {sugestoesChave.map((nome) => (
            <option key={nome} value={nome} />
          ))}
        </datalist>

        <div className="flex flex-col gap-2">
          <p className="text-sm font-medium">Linhas</p>
          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full border-collapse text-sm">
              <thead className="bg-muted/60">
                <tr>
                  {colunas.map((coluna, c) => (
                    <th
                      key={c}
                      scope="col"
                      className={cn(
                        "border-b px-2 py-2 text-left text-xs font-medium whitespace-nowrap",
                        coluna.tipo === "valor" && "bg-primary/5",
                        c > 0 && "border-l",
                      )}
                    >
                      {rotuloColuna(tabela, coluna)}
                    </th>
                  ))}
                  <th scope="col" className="w-px border-b border-l px-2 py-2">
                    <span className="sr-only">Ações</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {tabela.linhas.map((linha, linhaIndex) => (
                  <tr key={linhaIndex} className="border-b last:border-b-0 hover:bg-muted/30">
                    {colunas.map((coluna, c) => {
                      const rotulo = `${rotuloColuna(tabela, coluna)} (linha ${linhaIndex + 1})`;
                      return (
                        <td key={c} className={cn("p-1", c > 0 && "border-l", coluna.tipo === "valor" && "bg-primary/5")}>
                          {coluna.tipo === "sexo" ? (
                            <select
                              aria-label={rotulo}
                              className={cn(selectClassName, "min-w-28 border-transparent")}
                              value={lerCelula(linha, coluna)}
                              onChange={(e) => mudarCelula(linhaIndex, coluna, e.target.value)}
                              onPaste={(e) => colar(e, linhaIndex, c)}
                            >
                              <option value="">Qualquer</option>
                              <option value="1">Masculino</option>
                              <option value="0">Feminino</option>
                            </select>
                          ) : (
                            <Input
                              aria-label={rotulo}
                              inputMode="decimal"
                              className="h-8 min-w-20 border-transparent shadow-none focus-visible:border-ring"
                              value={lerCelula(linha, coluna)}
                              onChange={(e) => mudarCelula(linhaIndex, coluna, e.target.value)}
                              onPaste={(e) => colar(e, linhaIndex, c)}
                              placeholder={coluna.tipo === "faixa" ? "aberto" : undefined}
                            />
                          )}
                        </td>
                      );
                    })}
                    <td className="border-l p-1">
                      <div className="flex">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          aria-label={`Duplicar linha ${linhaIndex + 1}`}
                          onClick={() =>
                            atualizar({
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
                          size="icon-sm"
                          aria-label={`Remover linha ${linhaIndex + 1}`}
                          disabled={tabela.linhas.length === 1}
                          onClick={() => atualizar({ linhas: tabela.linhas.filter((_, i) => i !== linhaIndex) })}
                        >
                          <Trash2 />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="self-start"
            onClick={() =>
              atualizar({ linhas: [...tabela.linhas, novaLinha(tabela.chaves.length, tabela.saidas.length)] })
            }
          >
            <Plus />
            Adicionar linha
          </Button>
        </div>

        {tentouSalvar && erro && <p className="text-sm text-destructive">{erro.mensagem}</p>}

        <DialogFooter className="sm:justify-between">
          <Button type="button" variant="outline" onClick={pedirFechar}>
            Cancelar
          </Button>
          <Button type="button" onClick={salvar}>
            Salvar tabela
          </Button>
        </DialogFooter>
      </DialogContent>

      <Dialog open={confirmandoDescarte} onOpenChange={setConfirmandoDescarte}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Descartar alterações da tabela?</DialogTitle>
            <DialogDescription>
              A tabela só entra no exame ao clicar em &quot;Salvar tabela&quot;. Se
              fechar agora, o que foi preenchido será perdido.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="sm:justify-between">
            <Button type="button" variant="outline" onClick={() => setConfirmandoDescarte(false)}>
              Continuar editando
            </Button>
            <Button type="button" variant="destructive" onClick={onFechar}>
              Descartar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Dialog>
  );
}

function ListaNomes({
  titulo,
  rotuloItem,
  placeholder,
  itens,
  listId,
  onMudar,
  onAdicionar,
  onRemover,
  rotuloAdicionar,
}: {
  titulo: string;
  rotuloItem: string;
  placeholder: string;
  itens: string[];
  listId?: string;
  onMudar: (indice: number, valor: string) => void;
  onAdicionar: () => void;
  onRemover: (indice: number) => void;
  rotuloAdicionar: string;
}) {
  const idBase = useId();
  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm font-medium">{titulo}</p>
      {itens.map((item, i) => (
        <div key={i} className="flex items-end gap-2">
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <Label htmlFor={`${idBase}-${i}`} className="text-xs text-muted-foreground">
              {rotuloItem} {i + 1}
            </Label>
            <Input
              id={`${idBase}-${i}`}
              list={listId}
              value={item}
              onChange={(e) => onMudar(i, e.target.value)}
              placeholder={placeholder}
            />
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label={`Remover ${rotuloItem.toLowerCase()} ${item || i + 1}`}
            disabled={itens.length === 1}
            onClick={() => onRemover(i)}
          >
            <Trash2 />
          </Button>
        </div>
      ))}
      <Button type="button" variant="outline" size="sm" className="self-start" onClick={onAdicionar}>
        <Plus />
        {rotuloAdicionar}
      </Button>
    </div>
  );
}
