/**
 * Colunas do tipo CALCULADO nunca são preenchidas pela clínica: o valor é
 * derivado de outras colunas (NUMERO ou outra CALCULADO) do mesmo exame por
 * uma fórmula com sintaxe `{Nome da coluna}`, ex: `{Peso} / ({Altura} * {Altura})`.
 * Nunca é gravado no banco — é recalculado toda vez que a tela carrega, a
 * partir dos valores reais salvos, então funciona em execuções já existentes
 * sem precisar migrar dado histórico.
 *
 * Regra que elimina a necessidade de detectar ciclo: uma fórmula só pode
 * referenciar uma coluna que aparece ANTES dela na ordem do exame (seção →
 * campo → coluna). Isso permite encadear calculadas (IMC → Classificação do
 * IMC) sem análise de grafo — é só checar posição. Por isso as colunas
 * calculadas/numéricas precisam de nome único no exame (é a chave de
 * referência) e só podem existir em campos não-repetíveis (senão "qual linha"
 * vira ambíguo).
 *
 * Uma opção de coluna MULTIPLA_ESCOLHA também pode ter uma condição (ex:
 * `{IMC} < 18.5`) que a marca sozinha, na mesma passagem — ver `opcoesCondicionais`
 * em `ColunaCalculo`/`ColunaValidavel` e `calcularColunas`.
 */

const TOKEN_REGEX = /\{([^{}]+)\}/g;

export type ResultadoFormula = { valor: number } | { erro: string };
export type ResultadoCondicao = { valor: boolean } | { erro: string };
export type ResultadoOpcoesAutomaticas = {
  selecionadas: string[];
  erros: Record<string, string>;
};

export type OpcaoCondicional = { opcao: string; formula: string };

export type ColunaCalculo = {
  id: string;
  titulo: string;
  tipo: string;
  formula?: string | null;
  repetivel: boolean;
  opcoes?: string[];
  multiplaSelecao?: boolean;
  opcoesCondicionais?: OpcaoCondicional[];
};

export type ColunaValidavel = {
  titulo: string;
  tipo: string;
  formula?: string | null;
  repetivel: boolean;
  opcoes?: string[];
  opcoesCondicionais?: OpcaoCondicional[];
};

const TIPOS_REFERENCIAVEIS = new Set(["NUMERO", "CALCULADO"]);

export function normalizarTitulo(titulo: string): string {
  return titulo.trim().toLowerCase();
}

/** `ExameCampoColuna.opcoesCondicionais` vem do Prisma como `Json` (tipo
 * `unknown` pro TS) — normaliza pro shape esperado, tratando qualquer coisa
 * inesperada (null, formato antigo) como "nenhuma condição". */
export function parseOpcoesCondicionais(valor: unknown): OpcaoCondicional[] {
  if (!Array.isArray(valor)) return [];
  return valor.filter(
    (item): item is OpcaoCondicional =>
      typeof item === "object" &&
      item !== null &&
      typeof (item as OpcaoCondicional).opcao === "string" &&
      typeof (item as OpcaoCondicional).formula === "string",
  );
}

/** Nomes de coluna referenciados por uma fórmula, ex: `{Peso}/{Altura}` → ["Peso","Altura"]. */
export function extrairReferencias(formula: string): string[] {
  const nomes: string[] = [];
  const vistos = new Set<string>();
  for (const match of formula.matchAll(TOKEN_REGEX)) {
    const nome = match[1].trim();
    const chave = normalizarTitulo(nome);
    if (nome && !vistos.has(chave)) {
      vistos.add(chave);
      nomes.push(nome);
    }
  }
  return nomes;
}

/** Substitui `{tituloAntigo}` por `{tituloNovo}` — usado ao renomear uma coluna no cadastro. */
export function renomearReferenciaFormula(
  formula: string,
  tituloAntigo: string,
  tituloNovo: string,
): string {
  const antigo = normalizarTitulo(tituloAntigo);
  if (!antigo) return formula;
  return formula.replace(TOKEN_REGEX, (match, nome: string) =>
    normalizarTitulo(nome) === antigo ? `{${tituloNovo.trim()}}` : match,
  );
}

function formatarLista(nomes: string[]): string {
  if (nomes.length === 1) return nomes[0];
  return `${nomes.slice(0, -1).join(", ")} e ${nomes[nomes.length - 1]}`;
}

function escapeRegExp(texto: string): string {
  return texto.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Parser recursivo simples de +,-,*,/,() sobre números literais — nunca `eval`. */
function avaliarExpressaoAritmetica(expressao: string): number {
  let pos = 0;

  function skipSpaces() {
    while (pos < expressao.length && /\s/.test(expressao[pos])) pos++;
  }

  function parseNumero(): number {
    skipSpaces();
    const inicio = pos;
    let temDigitos = false;
    while (pos < expressao.length && /[0-9]/.test(expressao[pos])) {
      pos++;
      temDigitos = true;
    }
    if (expressao[pos] === ".") {
      pos++;
      while (pos < expressao.length && /[0-9]/.test(expressao[pos])) {
        pos++;
        temDigitos = true;
      }
    }
    if (!temDigitos) throw new Error("Número inválido na fórmula");
    return Number(expressao.slice(inicio, pos));
  }

  function parseFator(): number {
    skipSpaces();
    if (expressao[pos] === "(") {
      pos++;
      const valor = parseExpressao();
      skipSpaces();
      if (expressao[pos] !== ")") throw new Error("Parêntese não fechado");
      pos++;
      return valor;
    }
    if (expressao[pos] === "-") {
      pos++;
      return -parseFator();
    }
    if (expressao[pos] === "+") {
      pos++;
      return parseFator();
    }
    return parseNumero();
  }

  function parseTermo(): number {
    let valor = parseFator();
    skipSpaces();
    while (expressao[pos] === "*" || expressao[pos] === "/") {
      const op = expressao[pos];
      pos++;
      const proximo = parseFator();
      valor = op === "*" ? valor * proximo : valor / proximo;
      skipSpaces();
    }
    return valor;
  }

  function parseExpressao(): number {
    let valor = parseTermo();
    skipSpaces();
    while (expressao[pos] === "+" || expressao[pos] === "-") {
      const op = expressao[pos];
      pos++;
      const proximo = parseTermo();
      valor = op === "+" ? valor + proximo : valor - proximo;
      skipSpaces();
    }
    return valor;
  }

  if (expressao.trim() === "") throw new Error("Fórmula vazia");
  const resultado = parseExpressao();
  skipSpaces();
  if (pos !== expressao.length) throw new Error("Caracteres inesperados na fórmula");
  return resultado;
}

function validarSintaxe(formula: string): boolean {
  try {
    avaliarExpressaoAritmetica(formula.replace(TOKEN_REGEX, "1"));
    return true;
  } catch {
    return false;
  }
}

/**
 * Condição de opção automática (MULTIPLA_ESCOLHA), ex: `{IMC} < 18.5`.
 * Formato: `<expressão> <comparador> <expressão>`, um único comparador no
 * nível mais externo (fora de parênteses) — sem operadores lógicos (E/OU).
 */
const COMPARADORES = ["<=", ">=", "==", "!=", "<", ">"] as const;
type Comparador = (typeof COMPARADORES)[number];

function encontrarComparador(
  expressao: string,
): { op: Comparador; pos: number } | null {
  let profundidade = 0;
  for (let i = 0; i < expressao.length; i++) {
    const c = expressao[i];
    if (c === "(") profundidade++;
    else if (c === ")") profundidade--;
    else if (profundidade === 0) {
      for (const op of COMPARADORES) {
        if (expressao.startsWith(op, i)) return { op, pos: i };
      }
    }
  }
  return null;
}

function avaliarComparador(op: Comparador, esquerda: number, direita: number): boolean {
  switch (op) {
    case "<=":
      return esquerda <= direita;
    case ">=":
      return esquerda >= direita;
    case "==":
      return esquerda === direita;
    case "!=":
      return esquerda !== direita;
    case "<":
      return esquerda < direita;
    case ">":
      return esquerda > direita;
  }
}

function avaliarCondicaoSubstituida(expressao: string): ResultadoCondicao {
  const comparador = encontrarComparador(expressao);
  if (!comparador) {
    return { erro: "A condição precisa de um comparador (<, <=, >, >=, ==, !=)" };
  }

  const esquerda = expressao.slice(0, comparador.pos);
  const direita = expressao.slice(comparador.pos + comparador.op.length);

  let valorEsquerda: number;
  let valorDireita: number;
  try {
    valorEsquerda = avaliarExpressaoAritmetica(esquerda);
    valorDireita = avaliarExpressaoAritmetica(direita);
  } catch {
    return { erro: "Condição inválida" };
  }

  if (!Number.isFinite(valorEsquerda) || !Number.isFinite(valorDireita)) {
    return { erro: "Não foi possível calcular a condição (divisão por zero)" };
  }

  return { valor: avaliarComparador(comparador.op, valorEsquerda, valorDireita) };
}

function validarSintaxeCondicao(formula: string): boolean {
  const substituida = formula.replace(TOKEN_REGEX, "1");
  const resultado = avaliarCondicaoSubstituida(substituida);
  return "valor" in resultado;
}

/**
 * Avalia a condição de uma opção automática contra os valores já resolvidos
 * (mesmo mapa usado por `avaliarFormula`). Nunca lança.
 */
export function avaliarCondicaoOpcao(
  formula: string,
  valoresPorTitulo: Map<string, number>,
): ResultadoCondicao {
  const referencias = extrairReferencias(formula);
  const faltando = referencias.filter((nome) => {
    const valor = valoresPorTitulo.get(normalizarTitulo(nome));
    return valor === undefined || !Number.isFinite(valor);
  });
  if (faltando.length > 0) {
    return { erro: `Preencha ${formatarLista(faltando)} para calcular` };
  }

  let expressao = formula;
  for (const nome of referencias) {
    const valor = valoresPorTitulo.get(normalizarTitulo(nome))!;
    expressao = expressao.replace(
      new RegExp(`\\{\\s*${escapeRegExp(nome)}\\s*\\}`, "gi"),
      `(${valor})`,
    );
  }

  return avaliarCondicaoSubstituida(expressao);
}

/**
 * Calcula uma fórmula contra os valores numéricos já resolvidos (chave =
 * `normalizarTitulo(titulo da coluna)`). Nunca lança — valor ausente/não
 * numérico ou divisão por zero viram `{ erro }` com mensagem pra exibir
 * junto ao campo calculado.
 */
export function avaliarFormula(
  formula: string,
  valoresPorTitulo: Map<string, number>,
): ResultadoFormula {
  const referencias = extrairReferencias(formula);
  const faltando = referencias.filter((nome) => {
    const valor = valoresPorTitulo.get(normalizarTitulo(nome));
    return valor === undefined || !Number.isFinite(valor);
  });
  if (faltando.length > 0) {
    return { erro: `Preencha ${formatarLista(faltando)} para calcular` };
  }

  let expressao = formula;
  for (const nome of referencias) {
    const valor = valoresPorTitulo.get(normalizarTitulo(nome))!;
    expressao = expressao.replace(
      new RegExp(`\\{\\s*${escapeRegExp(nome)}\\s*\\}`, "gi"),
      `(${valor})`,
    );
  }

  let resultado: number;
  try {
    resultado = avaliarExpressaoAritmetica(expressao);
  } catch {
    return { erro: "Fórmula inválida" };
  }

  if (!Number.isFinite(resultado)) {
    return { erro: "Não foi possível calcular (divisão por zero)" };
  }

  return { valor: resultado };
}

/** Arredonda pra exibição (2 casas, sem zero à toa) — nunca `toLocaleString` (banido fora de format.ts). */
export function formatarNumeroFormula(valor: number): string {
  return String(Math.round(valor * 100) / 100);
}

/**
 * Calcula todas as colunas CALCULADO de um exame, em ordem de documento
 * (a mesma ordem em que `colunas` é passado precisa ser seção → campo →
 * coluna). Colunas de campo repetível são ignoradas (nunca calculáveis nem
 * referenciáveis — ver regra no topo do arquivo). `valorBruto` devolve o
 * valor cru (string) já salvo de uma coluna NUMERO na linha única (0).
 */
/**
 * Passagem única, em ordem de documento: acumula `valoresPorTitulo` a partir
 * de NUMERO/CALCULADO (igual antes) e, ao chegar numa MULTIPLA_ESCOLHA com
 * `opcoesCondicionais`, avalia a condição de cada opção contra o que já foi
 * acumulado até ali (nunca a própria coluna, nunca o que vem depois — mesma
 * regra de ordem do CALCULADO). Em seleção única, a primeira opção (na ordem
 * de `opcoes`) cuja condição bate vence; em múltipla, todas que baterem.
 */
export function calcularColunas(
  colunas: ColunaCalculo[],
  valorBruto: (colunaId: string) => string | undefined,
): {
  calculados: Map<string, ResultadoFormula>;
  opcoesAutomaticas: Map<string, ResultadoOpcoesAutomaticas>;
} {
  const valoresPorTitulo = new Map<string, number>();
  const calculados = new Map<string, ResultadoFormula>();
  const opcoesAutomaticas = new Map<string, ResultadoOpcoesAutomaticas>();

  for (const coluna of colunas) {
    if (coluna.repetivel) continue;
    const chave = normalizarTitulo(coluna.titulo);

    if (coluna.tipo === "NUMERO") {
      if (!chave) continue;
      const bruto = valorBruto(coluna.id);
      const numero = bruto === undefined || bruto === "" ? NaN : Number(bruto);
      if (Number.isFinite(numero)) valoresPorTitulo.set(chave, numero);
      continue;
    }

    if (coluna.tipo === "CALCULADO") {
      if (!chave) continue;
      const resultado = avaliarFormula(coluna.formula ?? "", valoresPorTitulo);
      calculados.set(coluna.id, resultado);
      if ("valor" in resultado) valoresPorTitulo.set(chave, resultado.valor);
      continue;
    }

    if (
      coluna.tipo === "MULTIPLA_ESCOLHA" &&
      coluna.opcoesCondicionais &&
      coluna.opcoesCondicionais.length > 0
    ) {
      const formulaPorOpcao = new Map(
        coluna.opcoesCondicionais.map((c) => [c.opcao, c.formula]),
      );
      const selecionadas: string[] = [];
      const erros: Record<string, string> = {};
      for (const opcao of coluna.opcoes ?? []) {
        const formula = formulaPorOpcao.get(opcao);
        if (!formula) continue;
        const resultado = avaliarCondicaoOpcao(formula, valoresPorTitulo);
        if ("erro" in resultado) {
          erros[opcao] = resultado.erro;
          continue;
        }
        if (resultado.valor) {
          selecionadas.push(opcao);
          if (!coluna.multiplaSelecao) break;
        }
      }
      opcoesAutomaticas.set(coluna.id, { selecionadas, erros });
    }
  }

  return { calculados, opcoesAutomaticas };
}

export function calcularColunasFormula(
  colunas: ColunaCalculo[],
  valorBruto: (colunaId: string) => string | undefined,
): Map<string, ResultadoFormula> {
  return calcularColunas(colunas, valorBruto).calculados;
}

/**
 * Valida a estrutura de fórmulas do exame inteiro (cadastro): fórmula
 * obrigatória, só em campo não-repetível, só referências anteriores/
 * existentes, nomes de coluna numérica/calculada únicos, sintaxe válida.
 * `colunas` precisa vir em ordem de documento (seção → campo → coluna).
 * Devolve a primeira mensagem de erro encontrada, ou `null` se tudo ok.
 */
export function validarFormulasDoExame(colunas: ColunaValidavel[]): string | null {
  const disponiveis = new Set<string>();

  for (const coluna of colunas) {
    if (coluna.tipo === "CALCULADO") {
      const formula = (coluna.formula ?? "").trim();
      if (!formula) {
        return `A coluna calculada "${coluna.titulo}" precisa de uma fórmula`;
      }
      if (coluna.repetivel) {
        return `A coluna calculada "${coluna.titulo}" não pode estar em um campo com múltiplas entradas`;
      }

      const referencias = extrairReferencias(formula);
      if (referencias.length === 0) {
        return `A fórmula da coluna "${coluna.titulo}" não referencia nenhuma coluna`;
      }

      for (const nome of referencias) {
        if (normalizarTitulo(nome) === normalizarTitulo(coluna.titulo)) {
          return `A fórmula da coluna "${coluna.titulo}" não pode referenciar ela mesma`;
        }
        if (!disponiveis.has(normalizarTitulo(nome))) {
          return `A fórmula da coluna "${coluna.titulo}" referencia "${nome}", que não existe ou vem depois dela no exame`;
        }
      }

      if (!validarSintaxe(formula)) {
        return `A fórmula da coluna "${coluna.titulo}" tem um erro de sintaxe`;
      }
    }

    if (
      coluna.tipo === "MULTIPLA_ESCOLHA" &&
      coluna.opcoesCondicionais &&
      coluna.opcoesCondicionais.length > 0
    ) {
      const opcoes = coluna.opcoes ?? [];
      const opcoesComCondicao = coluna.opcoesCondicionais.map((c) => c.opcao);
      const setOpcoes = new Set(opcoes);
      const setCondicionadas = new Set(opcoesComCondicao);
      const cobreTodas =
        opcoesComCondicao.length === opcoes.length &&
        opcoes.every((o) => setCondicionadas.has(o)) &&
        opcoesComCondicao.every((o) => setOpcoes.has(o));
      if (!cobreTodas) {
        return `A coluna "${coluna.titulo}" precisa de uma condição para TODAS as opções (ou nenhuma) — não dá pra deixar só parte automática`;
      }

      for (const { opcao, formula } of coluna.opcoesCondicionais) {
        const f = formula.trim();
        if (!f) {
          return `A condição da opção "${opcao}" da coluna "${coluna.titulo}" está vazia`;
        }

        const referencias = extrairReferencias(f);
        if (referencias.length === 0) {
          return `A condição da opção "${opcao}" da coluna "${coluna.titulo}" não referencia nenhuma coluna`;
        }

        for (const nome of referencias) {
          if (normalizarTitulo(nome) === normalizarTitulo(coluna.titulo)) {
            return `A condição da opção "${opcao}" da coluna "${coluna.titulo}" não pode referenciar a própria coluna`;
          }
          if (!disponiveis.has(normalizarTitulo(nome))) {
            return `A condição da opção "${opcao}" da coluna "${coluna.titulo}" referencia "${nome}", que não existe ou vem depois dela no exame`;
          }
        }

        if (!validarSintaxeCondicao(f)) {
          return `A condição da opção "${opcao}" da coluna "${coluna.titulo}" tem um erro de sintaxe (use um comparador: <, <=, >, >=, ==, !=)`;
        }
      }
    }

    if (TIPOS_REFERENCIAVEIS.has(coluna.tipo) && !coluna.repetivel) {
      const chave = normalizarTitulo(coluna.titulo);
      if (chave) {
        if (disponiveis.has(chave)) {
          return `Já existe uma coluna numérica chamada "${coluna.titulo}" neste exame — use nomes únicos para referenciá-las em fórmulas`;
        }
        disponiveis.add(chave);
      }
    }
  }

  return null;
}
