"use client";

import { useId, useMemo, useRef, useState } from "react";
import { Plus, Sigma, Trash2 } from "lucide-react";
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
import {
  avaliarCondicaoOpcao,
  avaliarFormula,
  expandirVariaveis,
  extrairReferencias,
  formatarNumeroFormula,
  normalizarTitulo,
  renomearReferenciaFormula,
  VARIAVEIS_PACIENTE,
  type VariavelExame,
} from "@/lib/exame-formula";
import {
  aplicarSugestao,
  filtrarSugestoes,
  SUGESTAO_SE,
  tokenNoCursor,
  type Sugestao,
  type TipoSugestao,
} from "@/lib/formula-autocomplete";

const ROTULO_TIPO: Record<TipoSugestao, string> = {
  coluna: "coluna",
  variavel: "variável",
  paciente: "paciente",
  funcao: "função",
};

const COR_TIPO: Record<TipoSugestao, string> = {
  coluna: "bg-sky-500/15 text-sky-700 dark:text-sky-300",
  variavel: "bg-violet-500/15 text-violet-700 dark:text-violet-300",
  paciente: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  funcao: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
};

const DETALHE_PACIENTE: Record<string, string> = {
  Idade: "idade do paciente (anos)",
  Sexo: "1 = masculino, 0 = feminino",
};

/** Valor fictício inicial de cada referência na prévia. */
function valorPadrao(nome: string): string {
  const chave = normalizarTitulo(nome);
  if (chave === "idade") return "30";
  if (chave === "sexo") return "1";
  return "10";
}

export function FormulaDialog({
  titulo,
  modo,
  valorInicial,
  colunasDisponiveis,
  variaveis,
  onVariaveisChange,
  onRenomearVariavel,
  onAplicar,
  onFechar,
}: {
  titulo: string;
  modo: "formula" | "condicao";
  valorInicial: string;
  colunasDisponiveis: string[];
  variaveis: VariavelExame[];
  onVariaveisChange: (variaveis: VariavelExame[]) => void;
  /** Propaga a renomeação para as fórmulas/condições das colunas do exame. */
  onRenomearVariavel: (antigo: string, novo: string) => void;
  onAplicar: (formula: string) => void;
  onFechar: () => void;
}) {
  const idBase = useId();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [texto, setTexto] = useState(valorInicial);
  const [cursor, setCursor] = useState(valorInicial.length);
  const [indice, setIndice] = useState(0);
  const [forcado, setForcado] = useState(false);
  const [fechado, setFechado] = useState(false);
  const [valoresTeste, setValoresTeste] = useState<Record<string, string>>({});

  const todasSugestoes = useMemo<Sugestao[]>(
    () => [
      ...colunasDisponiveis.map<Sugestao>((nome) => ({
        tipo: "coluna",
        rotulo: nome,
        insercao: `{${nome}}`,
        detalhe: "valor da coluna",
      })),
      ...variaveis
        .filter((v) => v.nome.trim())
        .map<Sugestao>((v) => ({
          tipo: "variavel",
          rotulo: v.nome.trim(),
          insercao: `{${v.nome.trim()}}`,
          detalhe: v.formula || undefined,
        })),
      ...VARIAVEIS_PACIENTE.map<Sugestao>((nome) => ({
        tipo: "paciente",
        rotulo: nome,
        insercao: `{${nome}}`,
        detalhe: DETALHE_PACIENTE[nome],
      })),
      SUGESTAO_SE,
    ],
    [colunasDisponiveis, variaveis],
  );

  const token = useMemo(
    () =>
      tokenNoCursor(texto, cursor) ??
      (forcado ? { inicio: cursor, fim: cursor, prefixo: "" } : null),
    [texto, cursor, forcado],
  );
  const sugestoes = useMemo(
    () => (token && !fechado ? filtrarSugestoes(token.prefixo, todasSugestoes) : []),
    [token, fechado, todasSugestoes],
  );
  const indiceAtivo = Math.min(indice, Math.max(sugestoes.length - 1, 0));
  const listaAberta = sugestoes.length > 0;

  function posicionar(posicao: number) {
    setCursor(posicao);
    requestAnimationFrame(() => {
      const el = textareaRef.current;
      if (!el) return;
      el.focus();
      el.setSelectionRange(posicao, posicao);
    });
  }

  function inserir(trecho: string, cursorNoTrecho?: number) {
    const el = textareaRef.current;
    const inicio = el?.selectionStart ?? texto.length;
    const fim = el?.selectionEnd ?? inicio;
    setTexto(texto.slice(0, inicio) + trecho + texto.slice(fim));
    setForcado(false);
    posicionar(inicio + (cursorNoTrecho ?? trecho.length));
  }

  function aceitar(sugestao: Sugestao) {
    if (!token) return;
    const resultado = aplicarSugestao(texto, token, sugestao);
    setTexto(resultado.texto);
    setForcado(false);
    setIndice(0);
    posicionar(resultado.cursor);
  }

  function aoDigitar(valor: string, posicao: number) {
    setTexto(valor);
    setCursor(posicao);
    setFechado(false);
    setForcado(false);
    setIndice(0);
  }

  function aoTeclar(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if ((e.ctrlKey || e.metaKey) && e.key === " ") {
      e.preventDefault();
      setForcado(true);
      setFechado(false);
      setIndice(0);
      return;
    }
    if (!listaAberta) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setIndice((indiceAtivo + 1) % sugestoes.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setIndice((indiceAtivo - 1 + sugestoes.length) % sugestoes.length);
    } else if (e.key === "Enter" || e.key === "Tab") {
      e.preventDefault();
      aceitar(sugestoes[indiceAtivo]);
    } else if (e.key === "Escape") {
      // Fecha só a lista, não o modal.
      e.preventDefault();
      e.stopPropagation();
      setFechado(true);
      setForcado(false);
    }
  }

  // --- Variáveis ---------------------------------------------------------

  function atualizarVariavel(index: number, patch: Partial<VariavelExame>) {
    const atual = variaveis[index];
    const proximo = variaveis.map((v, i) => (i === index ? { ...v, ...patch } : v));
    if (
      patch.nome !== undefined &&
      atual.nome.trim() &&
      patch.nome.trim() &&
      normalizarTitulo(patch.nome) !== normalizarTitulo(atual.nome)
    ) {
      // Renomear propaga para quem usava a variável (outras variáveis, a
      // fórmula em edição e as fórmulas/condições das colunas).
      onVariaveisChange(
        proximo.map((v, i) =>
          i === index
            ? v
            : { ...v, formula: renomearReferenciaFormula(v.formula, atual.nome, patch.nome!) },
        ),
      );
      setTexto((t) => renomearReferenciaFormula(t, atual.nome, patch.nome!));
      onRenomearVariavel(atual.nome, patch.nome);
      return;
    }
    onVariaveisChange(proximo);
  }

  function adicionarVariavel() {
    let n = variaveis.length + 1;
    while (variaveis.some((v) => normalizarTitulo(v.nome) === `variavel ${n}`)) n++;
    onVariaveisChange([...variaveis, { nome: `Variavel ${n}`, formula: "" }]);
  }

  function removerVariavel(index: number) {
    onVariaveisChange(variaveis.filter((_, i) => i !== index));
  }

  // --- Prévia com valores fictícios -------------------------------------

  const expandida = expandirVariaveis(texto, variaveis);
  const referenciasTeste = useMemo(() => {
    const nomes = new Map<string, string>();
    const fontes = [
      expandirVariaveis(texto, variaveis),
      ...variaveis.map((v) => expandirVariaveis(v.formula, variaveis)),
    ];
    for (const fonte of fontes) {
      for (const nome of extrairReferencias(fonte)) {
        const chave = normalizarTitulo(nome);
        if (!nomes.has(chave)) nomes.set(chave, nome);
      }
    }
    return Array.from(nomes.entries());
  }, [texto, variaveis]);

  const mapaTeste = useMemo(() => {
    const mapa = new Map<string, number>();
    for (const [chave, nome] of referenciasTeste) {
      const bruto = (valoresTeste[chave] ?? valorPadrao(nome)).trim().replace(",", ".");
      const numero = bruto === "" ? NaN : Number(bruto);
      if (Number.isFinite(numero)) mapa.set(chave, numero);
    }
    return mapa;
  }, [referenciasTeste, valoresTeste]);

  const resultado = useMemo(() => {
    if (!texto.trim()) return null;
    return modo === "condicao"
      ? avaliarCondicaoOpcao(expandida, mapaTeste)
      : avaliarFormula(expandida, mapaTeste);
  }, [texto, expandida, mapaTeste, modo]);

  const inputId = `${idBase}-formula`;
  const listaId = `${idBase}-sugestoes`;

  return (
    <Dialog open onOpenChange={(aberto) => !aberto && onFechar()}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-5xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sigma className="size-4 text-violet-600 dark:text-violet-400" />
            {modo === "condicao" ? "Editor de condição" : "Editor de fórmula"}
          </DialogTitle>
          <DialogDescription>{titulo}</DialogDescription>
        </DialogHeader>

        <div className="grid gap-5 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
          <div className="flex min-w-0 flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor={inputId}>
                {modo === "condicao" ? "Condição" : "Fórmula"}
              </Label>
              <div className="relative">
                <textarea
                  id={inputId}
                  ref={textareaRef}
                  value={texto}
                  rows={4}
                  spellCheck={false}
                  autoComplete="off"
                  role="combobox"
                  aria-expanded={listaAberta}
                  aria-controls={listaId}
                  aria-autocomplete="list"
                  aria-activedescendant={
                    listaAberta ? `${listaId}-${indiceAtivo}` : undefined
                  }
                  onChange={(e) => aoDigitar(e.target.value, e.target.selectionStart)}
                  onSelect={(e) => setCursor(e.currentTarget.selectionStart)}
                  onKeyDown={aoTeclar}
                  onBlur={() => setForcado(false)}
                  placeholder={
                    modo === "condicao"
                      ? "Ex: {IMC} < 18.5 && {Idade} > 18"
                      : "Ex: SE({Sexo} == 1; {Peso} * 2; {Peso} * 3)"
                  }
                  className="w-full resize-y rounded-lg border border-input bg-transparent px-3 py-2 font-mono text-sm outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
                />
                {listaAberta && (
                  <ul
                    id={listaId}
                    role="listbox"
                    className="absolute inset-x-0 top-full z-20 mt-1 max-h-60 overflow-y-auto rounded-lg border bg-popover p-1 text-popover-foreground shadow-lg"
                  >
                    {sugestoes.map((sugestao, i) => (
                      <li
                        key={`${sugestao.tipo}-${sugestao.rotulo}`}
                        id={`${listaId}-${i}`}
                        role="option"
                        aria-selected={i === indiceAtivo}
                        // mouseDown (e não click) para o textarea não perder o foco antes.
                        onMouseDown={(e) => {
                          e.preventDefault();
                          aceitar(sugestao);
                        }}
                        className={cn(
                          "flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm",
                          i === indiceAtivo && "bg-accent text-accent-foreground",
                        )}
                      >
                        <span
                          className={cn(
                            "shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide",
                            COR_TIPO[sugestao.tipo],
                          )}
                        >
                          {ROTULO_TIPO[sugestao.tipo]}
                        </span>
                        <span className="font-mono">{sugestao.rotulo}</span>
                        {sugestao.detalhe && (
                          <span className="ml-auto truncate pl-2 text-xs text-muted-foreground">
                            {sugestao.detalhe}
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                Digite <kbd className="rounded border px-1">{"{"}</kbd> ou o começo de um
                nome para sugestões · <kbd className="rounded border px-1">↑</kbd>{" "}
                <kbd className="rounded border px-1">↓</kbd> navega ·{" "}
                <kbd className="rounded border px-1">Enter</kbd>/
                <kbd className="rounded border px-1">Tab</kbd> aceita ·{" "}
                <kbd className="rounded border px-1">Ctrl</kbd>+
                <kbd className="rounded border px-1">Espaço</kbd> abre a lista.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              {todasSugestoes
                .filter((s) => s.tipo !== "funcao")
                .map((s) => (
                  <Button
                    key={`${s.tipo}-${s.rotulo}`}
                    type="button"
                    variant="outline"
                    size="sm"
                    className={cn(
                      "h-7 px-2 text-xs",
                      s.tipo === "variavel" && "border-violet-500/40",
                      s.tipo === "paciente" && "border-emerald-500/40",
                    )}
                    title={s.detalhe}
                    onClick={() => inserir(s.insercao)}
                  >
                    {s.rotulo}
                  </Button>
                ))}
              <span className="mx-1 h-4 w-px bg-border" />
              {(["+", "-", "*", "/", "(", ")"] as const).map((op) => (
                <Button
                  key={op}
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 px-0 text-xs"
                  onClick={() => inserir(op)}
                >
                  {op === "*" ? "×" : op === "/" ? "÷" : op}
                </Button>
              ))}
              <span className="mx-1 h-4 w-px bg-border" />
              {(["<", "<=", ">", ">=", "==", "!="] as const).map((op) => (
                <Button
                  key={op}
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 px-1.5 text-xs"
                  onClick={() => inserir(` ${op} `)}
                >
                  {op}
                </Button>
              ))}
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 px-1.5 font-mono text-xs"
                title="E — as duas partes precisam ser verdadeiras"
                onClick={() => inserir(" && ")}
              >
                &&
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-7 px-2 font-mono text-xs"
                title={SUGESTAO_SE.detalhe}
                onClick={() => inserir(SUGESTAO_SE.insercao, SUGESTAO_SE.cursorNaInsercao)}
              >
                SE
              </Button>
            </div>

            <section
              aria-label="Prévia do cálculo"
              className="flex flex-col gap-3 rounded-xl border border-violet-500/30 bg-violet-500/5 p-3"
            >
              <h3 className="text-sm font-semibold">Prévia com valores fictícios</h3>
              {referenciasTeste.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  Use {"{Nome}"} de uma coluna, variável ou do paciente para testar com
                  valores.
                </p>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2">
                  {referenciasTeste.map(([chave, nome]) => (
                    <div key={chave} className="flex flex-col gap-1">
                      <Label htmlFor={`${idBase}-teste-${chave}`} className="text-xs">
                        {nome}
                      </Label>
                      <Input
                        id={`${idBase}-teste-${chave}`}
                        inputMode="decimal"
                        value={valoresTeste[chave] ?? valorPadrao(nome)}
                        onChange={(e) =>
                          setValoresTeste((prev) => ({ ...prev, [chave]: e.target.value }))
                        }
                      />
                      {DETALHE_PACIENTE[nome] && (
                        <span className="text-[11px] text-muted-foreground">
                          {DETALHE_PACIENTE[nome]}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
              <div
                aria-live="polite"
                className="rounded-lg border bg-background px-3 py-2 text-sm"
              >
                {!resultado ? (
                  <span className="text-muted-foreground">Digite uma {modo === "condicao" ? "condição" : "fórmula"} para ver o resultado.</span>
                ) : "erro" in resultado ? (
                  <span className="text-destructive">{resultado.erro}</span>
                ) : typeof resultado.valor === "boolean" ? (
                  <span className="font-semibold">
                    {resultado.valor ? "Verdadeiro" : "Falso"}
                  </span>
                ) : (
                  <span className="font-semibold text-violet-700 dark:text-violet-300">
                    = {formatarNumeroFormula(resultado.valor)}
                  </span>
                )}
              </div>
              {expandida !== texto && texto.trim() && (
                <p className="break-words font-mono text-[11px] text-muted-foreground">
                  Com variáveis expandidas: {expandida}
                </p>
              )}
            </section>
          </div>

          <section aria-label="Variáveis do exame" className="flex min-w-0 flex-col gap-3">
            <div>
              <h3 className="text-sm font-semibold">Variáveis do exame</h3>
              <p className="text-xs text-muted-foreground">
                Nomes reutilizáveis nas fórmulas deste exame: uma constante (ex. 0.9) ou
                uma sub-fórmula (ex. {"{Tríceps} + {Subescapular}"}). São salvas junto
                com o exame.
              </p>
            </div>
            {variaveis.length === 0 && (
              <p className="rounded-lg border border-dashed p-3 text-xs text-muted-foreground">
                Nenhuma variável criada ainda.
              </p>
            )}
            {variaveis.map((variavel, index) => {
              const valorVariavel =
                variavel.formula.trim()
                  ? avaliarFormula(expandirVariaveis(variavel.formula, variaveis), mapaTeste)
                  : null;
              return (
                <div
                  key={index}
                  className="flex flex-col gap-2 rounded-xl border bg-card p-3"
                >
                  <div className="flex items-end gap-2">
                    <div className="flex min-w-0 flex-1 flex-col gap-1">
                      <Label htmlFor={`${idBase}-var-nome-${index}`} className="text-xs">
                        Nome da variável
                      </Label>
                      <Input
                        id={`${idBase}-var-nome-${index}`}
                        value={variavel.nome}
                        onChange={(e) => atualizarVariavel(index, { nome: e.target.value })}
                      />
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="shrink-0"
                      onClick={() => removerVariavel(index)}
                    >
                      <Trash2 className="size-3.5 text-destructive" />
                      <span className="sr-only">Remover variável</span>
                    </Button>
                  </div>
                  <div className="flex flex-col gap-1">
                    <Label htmlFor={`${idBase}-var-formula-${index}`} className="text-xs">
                      Valor ou fórmula
                    </Label>
                    <Input
                      id={`${idBase}-var-formula-${index}`}
                      className="font-mono"
                      value={variavel.formula}
                      placeholder="Ex: 0.9  ou  {Tríceps} + {Subescapular}"
                      onChange={(e) => atualizarVariavel(index, { formula: e.target.value })}
                    />
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="min-w-0 truncate text-xs text-muted-foreground">
                      {valorVariavel === null
                        ? "—"
                        : "erro" in valorVariavel
                          ? valorVariavel.erro
                          : `Prévia: ${formatarNumeroFormula(valorVariavel.valor)}`}
                    </span>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-7 shrink-0 px-2 text-xs"
                      disabled={!variavel.nome.trim()}
                      onClick={() => inserir(`{${variavel.nome.trim()}}`)}
                    >
                      Inserir na fórmula
                    </Button>
                  </div>
                </div>
              );
            })}
            <Button type="button" variant="outline" size="sm" onClick={adicionarVariavel}>
              <Plus className="size-3.5" />
              Nova variável
            </Button>
          </section>
        </div>

        <DialogFooter className="sm:justify-between">
          <Button type="button" variant="outline" onClick={onFechar}>
            Cancelar
          </Button>
          <Button
            type="button"
            onClick={() => {
              onAplicar(texto);
              onFechar();
            }}
          >
            Aplicar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
