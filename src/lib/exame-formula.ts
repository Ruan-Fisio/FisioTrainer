/**
 * Colunas do tipo CALCULADO nunca são preenchidas pela clínica: o valor é
 * derivado de outras colunas (NUMERO ou outra CALCULADO) do mesmo exame por
 * uma fórmula com sintaxe `{Nome da coluna}`, ex: `{Peso} / ({Altura} * {Altura})`.
 * Nunca é gravado no banco — é recalculado toda vez que a tela carrega, a
 * partir dos valores reais salvos, então funciona em execuções já existentes
 * sem precisar migrar dado histórico.
 *
 * Uma fórmula pode referenciar qualquer coluna numérica/calculada do exame,
 * em qualquer posição (antes ou depois) — a ordem dos campos não importa. O
 * cálculo resolve as dependências sob demanda (`calcularColunas`) e o cadastro
 * barra ciclos (A depende de B e B de A). Por isso as colunas
 * calculadas/numéricas de campos não-repetíveis precisam de nome único no exame
 * (é a chave de referência).
 *
 * Em campo repetível (múltiplas entradas) a fórmula vale por entrada: enxerga as
 * colunas da mesma entrada (que têm precedência) e as colunas não-repetíveis do
 * exame — ver `calcularLinhasRepetiveis`. Fora do próprio campo, uma coluna
 * repetível não é referenciável (senão "qual linha" vira ambíguo).
 *
 * A exceção é a agregação, que resolve essa ambiguidade usando todas as entradas:
 * `SOMA({Seção > Coluna})` (também MEDIA, MIN, MAX e CONTAGEM) junta as colunas
 * com aquele título na seção, ou no exame inteiro em `SOMA({Coluna})`. Vira uma
 * referência comum (`{SOMA(Seção > Coluna)}`, ver `canonizarAgregacoes`) cujo
 * valor `calcularColunas` deixa pronto junto com o das colunas.
 *
 * Uma opção de coluna MULTIPLA_ESCOLHA também pode ter uma condição (ex:
 * `{IMC} < 18.5`) que a marca sozinha, na mesma passagem — ver `opcoesCondicionais`
 * em `ColunaCalculo`/`ColunaValidavel` e `calcularColunas`.
 *
 * Uma coluna MULTIPLA_ESCOLHA com `pontuacoes` (cada opção vale um número fixo)
 * também é referenciável como `{Coluna}`: vale a soma dos pontos das opções
 * marcadas, ou fica sem valor se nada estiver marcado. Se for automática, ela
 * é resolvida sob demanda junto com as calculadas (ver `calcularColunas`).
 */

import {
  selecionadasDoValor,
  somarPontuacao,
  type OpcaoPontuada,
} from "@/lib/pontuacao-opcao";

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
  /** Agrupa as colunas de um campo repetível (escopo de `calcularLinhasRepetiveis`). */
  campoId?: string;
  /** Nome da seção — o alvo de `SOMA({Seção > Coluna})`. */
  secao?: string;
  opcoes?: string[];
  multiplaSelecao?: boolean;
  opcoesCondicionais?: OpcaoCondicional[];
  pontuacoes?: OpcaoPontuada[];
};

export type ColunaValidavel = {
  titulo: string;
  tipo: string;
  formula?: string | null;
  repetivel: boolean;
  /** Agrupa as colunas de um campo repetível (escopo das referências). */
  campoId?: string;
  /** Nome da seção — o alvo de `SOMA({Seção > Coluna})`. */
  secao?: string;
  opcoes?: string[];
  opcoesCondicionais?: OpcaoCondicional[];
  pontuacoes?: OpcaoPontuada[];
};

/** MULTIPLA_ESCOLHA com pontuação por opção — referenciável como número. */
function ehPontuada(coluna: { tipo: string; pontuacoes?: OpcaoPontuada[] }): boolean {
  return (
    coluna.tipo === "MULTIPLA_ESCOLHA" &&
    coluna.pontuacoes !== undefined &&
    coluna.pontuacoes.length > 0
  );
}

export const FUNCOES_AGREGACAO = ["SOMA", "MEDIA", "MIN", "MAX", "CONTAGEM"] as const;
export type FuncaoAgregacao = (typeof FUNCOES_AGREGACAO)[number];

const AGREGACAO_NOME = "SOMA|M[EÉ]DIA|MIN|MAX|CONTAGEM";
const AGREGACAO_REGEX = new RegExp(
  `(?<![\\p{L}\\p{N}_])(${AGREGACAO_NOME})\\s*\\(\\s*\\{([^{}]+)\\}\\s*\\)`,
  "giu",
);
const AGREGACAO_CANONICA_REGEX = new RegExp(`^(${AGREGACAO_NOME})\\((.+)\\)$`, "iu");

function funcaoAgregacao(nome: string): FuncaoAgregacao {
  return nome.toUpperCase().replace("É", "E") as FuncaoAgregacao;
}

/** `SOMA({Seção > Coluna})` → `{SOMA(Seção > Coluna)}`: uma referência como outra
 * qualquer para o resto do motor (substituição, validação, prévia). */
function canonizarAgregacoes(formula: string): string {
  return formula.replace(
    AGREGACAO_REGEX,
    (_, funcao: string, alvo: string) => `{${funcaoAgregacao(funcao)}(${alvo.trim()})}`,
  );
}

/** Lê uma referência já canônica: `SOMA(Seção > Coluna)` → função e alvo. */
export function parseAgregacao(
  nome: string,
): { funcao: FuncaoAgregacao; alvo: string } | null {
  const match = AGREGACAO_CANONICA_REGEX.exec(nome.trim());
  return match ? { funcao: funcaoAgregacao(match[1]), alvo: match[2].trim() } : null;
}

/** Divide `Seção > Coluna` (no primeiro `>`); `null` se o alvo não cita seção. */
function dividirAlvo(alvo: string): { secao: string; coluna: string } | null {
  const pos = alvo.indexOf(">");
  if (pos === -1) return null;
  return { secao: alvo.slice(0, pos).trim(), coluna: alvo.slice(pos + 1).trim() };
}

/** Colunas numéricas que um alvo alcança. Um título que contenha `>` vale inteiro,
 * antes de tentar ler o alvo como `Seção > Coluna`. */
export function colunasDaAgregacao<
  C extends { titulo: string; tipo: string; secao?: string; pontuacoes?: OpcaoPontuada[] },
>(colunas: C[], alvo: string): C[] {
  const numericas = colunas.filter(ehReferenciavel);
  const chave = normalizarTitulo(alvo);
  const peloTitulo = numericas.filter((c) => normalizarTitulo(c.titulo) === chave);
  if (peloTitulo.length > 0) return peloTitulo;
  const partes = dividirAlvo(alvo);
  if (!partes) return [];
  return numericas.filter(
    (c) =>
      normalizarTitulo(c.secao ?? "") === normalizarTitulo(partes.secao) &&
      normalizarTitulo(c.titulo) === normalizarTitulo(partes.coluna),
  );
}

/** Valores vazios já ficaram de fora. Sem nenhum valor: sem resultado ("Preencha..."),
 * exceto CONTAGEM, em que zero é a resposta. */
export function aplicarAgregacao(
  funcao: FuncaoAgregacao,
  numeros: number[],
): number | undefined {
  if (funcao === "CONTAGEM") return numeros.length;
  if (numeros.length === 0) return undefined;
  const soma = numeros.reduce((total, n) => total + n, 0);
  switch (funcao) {
    case "SOMA":
      return soma;
    case "MEDIA":
      return soma / numeros.length;
    case "MIN":
      return Math.min(...numeros);
    case "MAX":
      return Math.max(...numeros);
  }
}

function formulasDaColuna(coluna: {
  tipo: string;
  formula?: string | null;
  opcoesCondicionais?: OpcaoCondicional[];
}): string[] {
  if (coluna.tipo === "CALCULADO") return [coluna.formula ?? ""];
  return (coluna.opcoesCondicionais ?? []).map((c) => c.formula);
}

/** Coluna que uma fórmula pode citar (fora campo repetível, checado à parte). */
function ehReferenciavel(coluna: { tipo: string; pontuacoes?: OpcaoPontuada[] }): boolean {
  return coluna.tipo === "NUMERO" || coluna.tipo === "CALCULADO" || ehPontuada(coluna);
}

function temOpcoesAutomaticas(coluna: {
  tipo: string;
  opcoesCondicionais?: OpcaoCondicional[];
}): boolean {
  return (
    coluna.tipo === "MULTIPLA_ESCOLHA" &&
    coluna.opcoesCondicionais !== undefined &&
    coluna.opcoesCondicionais.length > 0
  );
}

/**
 * Variáveis do perfil do paciente, referenciáveis em qualquer fórmula/condição
 * como se fossem uma coluna numérica: `{Idade}` (campo Idade do cadastro) e `{Sexo}`
 * (Masculino = 1, Feminino = 0). Uma coluna do exame com o mesmo nome tem
 * precedência (não quebra exames cadastrados antes desta feature).
 */
export const VARIAVEIS_PACIENTE = ["Idade", "Sexo"] as const;

export type DadosPacienteFormula = {
  sexo?: "MASCULINO" | "FEMININO" | null;
  /** Idade em anos, do campo `idade` do cadastro do paciente. */
  idade?: number | null;
};

/** Valores do perfil do paciente por título normalizado; dado ausente fica de fora
 * (a fórmula mostra "Preencha Idade para calcular"). */
export function variaveisDoPaciente(dados?: DadosPacienteFormula | null): Map<string, number> {
  const mapa = new Map<string, number>();
  if (!dados) return mapa;
  if (dados.idade != null && Number.isFinite(dados.idade)) {
    mapa.set(normalizarTitulo("Idade"), dados.idade);
  }
  if (dados.sexo) mapa.set(normalizarTitulo("Sexo"), dados.sexo === "MASCULINO" ? 1 : 0);
  return mapa;
}

export function normalizarTitulo(titulo: string): string {
  return titulo.trim().toLowerCase();
}

/**
 * Variável do exame `{Soma pontuações}`: soma dos pontos das opções marcadas em
 * TODAS as colunas MULTIPLA_ESCOLHA marcadas como pontuação (campo não-repetível).
 * Coluna sem resposta conta como 0; nenhuma respondida → sem valor. Aceita
 * também sem acento (`{Soma pontuacoes}`). Uma coluna do exame com o mesmo nome
 * tem precedência.
 */
export const VARIAVEL_SOMA_PONTUACOES = "Soma pontuações";
const CHAVES_SOMA_PONTUACOES = [
  normalizarTitulo("Soma pontuações"),
  normalizarTitulo("Soma pontuacoes"),
];

export function ehSomaPontuacoes(nome: string): boolean {
  return CHAVES_SOMA_PONTUACOES.includes(normalizarTitulo(nome));
}

function referenciaSomaPontuacoes(formula: string): boolean {
  return extrairReferencias(formula).some(ehSomaPontuacoes);
}

/**
 * Variável do exame: um nome reutilizável em fórmulas/condições como `{Nome}`.
 * Pode ser uma constante (`0.9`) ou uma sub-fórmula (`{Tríceps} + {Subescapular}`).
 * É expandida em texto (`(sub-fórmula)`) antes de avaliar, então ela
 * enxerga as mesmas colunas que a fórmula que a usa.
 */
export type VariavelExame = { nome: string; formula: string };

/** `Exame.variaveis` vem do Prisma como `Json` — normaliza, ignorando formato inesperado. */
export function parseVariaveis(valor: unknown): VariavelExame[] {
  if (!Array.isArray(valor)) return [];
  return valor.filter(
    (item): item is VariavelExame =>
      typeof item === "object" &&
      item !== null &&
      typeof (item as VariavelExame).nome === "string" &&
      typeof (item as VariavelExame).formula === "string",
  );
}

/** Troca cada `{Variável}` pelo texto da sua fórmula entre parênteses (recursivo;
 * ciclo é deixado como está — `validarVariaveis` barra no cadastro). */
export function expandirVariaveis(formula: string, variaveis?: VariavelExame[]): string {
  if (!variaveis || variaveis.length === 0) return formula;
  const mapa = new Map(variaveis.map((v) => [normalizarTitulo(v.nome), v.formula]));
  function expandir(texto: string, pilha: string[]): string {
    return texto.replace(TOKEN_REGEX, (token, nome: string) => {
      const chave = normalizarTitulo(nome);
      const definicao = mapa.get(chave);
      if (definicao === undefined || pilha.includes(chave)) return token;
      return `(${expandir(canonizarAgregacoes(definicao), [...pilha, chave])})`;
    });
  }
  return expandir(canonizarAgregacoes(formula), []);
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
  for (const match of canonizarAgregacoes(formula).matchAll(TOKEN_REGEX)) {
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
  const novo = tituloNovo.trim();
  return formula.replace(TOKEN_REGEX, (match, nome: string) => {
    if (normalizarTitulo(nome) === antigo) return `{${novo}}`;
    const partes = dividirAlvo(nome);
    return partes && normalizarTitulo(partes.coluna) === antigo
      ? `{${partes.secao} > ${novo}}`
      : match;
  });
}

/** Renomeia só nas agregações: elas alcançam a coluna de qualquer lugar do exame. */
export function renomearEmAgregacoes(
  formula: string,
  tituloAntigo: string,
  tituloNovo: string,
): string {
  return formula.replace(AGREGACAO_REGEX, (chamada) =>
    renomearReferenciaFormula(chamada, tituloAntigo, tituloNovo),
  );
}

/** Renomeia só fora das agregações: as referências diretas, que têm escopo. */
export function renomearForaDeAgregacoes(
  formula: string,
  tituloAntigo: string,
  tituloNovo: string,
): string {
  let resultado = "";
  let inicio = 0;
  for (const match of formula.matchAll(AGREGACAO_REGEX)) {
    resultado +=
      renomearReferenciaFormula(formula.slice(inicio, match.index), tituloAntigo, tituloNovo) +
      match[0];
    inicio = match.index + match[0].length;
  }
  return resultado + renomearReferenciaFormula(formula.slice(inicio), tituloAntigo, tituloNovo);
}

/** Renomear uma seção atualiza o `Seção > Coluna` das agregações que a citam. */
export function renomearSecaoEmFormula(
  formula: string,
  secaoAntiga: string,
  secaoNova: string,
): string {
  const antiga = normalizarTitulo(secaoAntiga);
  if (!antiga) return formula;
  return formula.replace(AGREGACAO_REGEX, (chamada) =>
    chamada.replace(TOKEN_REGEX, (match, nome: string) => {
      const partes = dividirAlvo(nome);
      return partes && normalizarTitulo(partes.secao) === antiga
        ? `{${secaoNova.trim()} > ${partes.coluna}}`
        : match;
    }),
  );
}

function formatarLista(nomes: string[]): string {
  if (nomes.length === 1) return nomes[0];
  return `${nomes.slice(0, -1).join(", ")} e ${nomes[nomes.length - 1]}`;
}

function escapeRegExp(texto: string): string {
  return texto.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Parser recursivo simples de +,-,*,/,^,(),ABS() sobre números literais — nunca `eval`. */
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

  /** `SE(condição; valor_se_verdadeiro; valor_se_falso)` — os dois ramos são
   * validados, mas só o escolhido vale (ramos podem ter outro SE). */
  function parseSe(): number {
    pos += 2;
    skipSpaces();
    pos++; // "("
    const inicio = pos;
    const partes: string[] = [];
    let profundidade = 1;
    let ini = pos;
    while (pos < expressao.length && profundidade > 0) {
      const c = expressao[pos];
      if (c === "(") profundidade++;
      else if (c === ")") {
        profundidade--;
        if (profundidade === 0) break;
      } else if (c === ";" && profundidade === 1) {
        partes.push(expressao.slice(ini, pos));
        ini = pos + 1;
      }
      pos++;
    }
    if (profundidade !== 0) throw new Error("Parêntese não fechado");
    partes.push(expressao.slice(ini, pos));
    pos++; // ")"
    if (partes.length !== 3 || inicio === pos) {
      throw new Error("SE precisa de condição; valor se verdadeiro; valor se falso");
    }
    const condicao = avaliarCondicaoSubstituida(partes[0]);
    if ("erro" in condicao) throw new Error(condicao.erro);
    const seVerdadeiro = avaliarExpressaoAritmetica(partes[1]);
    const seFalso = avaliarExpressaoAritmetica(partes[2]);
    return condicao.valor ? seVerdadeiro : seFalso;
  }

  function parseEntreParenteses(): number {
    pos++; // "("
    const valor = parseExpressao();
    skipSpaces();
    if (expressao[pos] !== ")") throw new Error("Parêntese não fechado");
    pos++;
    return valor;
  }

  function parsePrimario(): number {
    skipSpaces();
    if (/^se\s*\(/i.test(expressao.slice(pos))) return parseSe();
    const abs = /^abs\s*\(/i.exec(expressao.slice(pos));
    if (abs) {
      pos += abs[0].length - 1; // fica no "("
      return Math.abs(parseEntreParenteses());
    }
    if (expressao[pos] === "(") return parseEntreParenteses();
    return parseNumero();
  }

  /** Potência (`^` ou `**`): associa à direita e pesa mais que `*` `/`, e o
   * expoente aceita sinal — `2^3^2` = 2^9, `-2^2` = -4, `2^-1` = 0.5. */
  function parsePotencia(): number {
    const base = parsePrimario();
    skipSpaces();
    if (expressao[pos] === "^") pos++;
    else if (expressao.startsWith("**", pos)) pos += 2;
    else return base;
    return base ** parseFator();
  }

  function parseFator(): number {
    skipSpaces();
    if (expressao[pos] === "-") {
      pos++;
      return -parseFator();
    }
    if (expressao[pos] === "+") {
      pos++;
      return parseFator();
    }
    return parsePotencia();
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
    avaliarExpressaoAritmetica(canonizarAgregacoes(formula).replace(TOKEN_REGEX, "1"));
    return true;
  } catch {
    return false;
  }
}

/**
 * Condição de opção automática (MULTIPLA_ESCOLHA), ex: `{IMC} < 18.5`, ou
 * várias cláusulas unidas por `&&` (E lógico), ex:
 * `{IMC} < 16 && {IMC} > 10` — cada cláusula é `<expressão> <comparador>
 * <expressão>` (um único comparador no nível mais externo, fora de
 * parênteses) e a condição inteira só é verdadeira se TODAS as cláusulas
 * forem. Não há `||` (OU) — só E, que já cobre o caso comum de faixa
 * (mínimo E máximo); um comparador só (sem `&&`) continua funcionando igual.
 */
const COMPARADORES = ["<=", ">=", "==", "!=", "<", ">"] as const;
type Comparador = (typeof COMPARADORES)[number];

/** Divide no `&&` do nível mais externo (fora de parênteses) — cada pedaço é
 * uma cláusula de comparação independente. Sem `&&` no nível externo, devolve
 * a expressão inteira como cláusula única. */
function separarClausulasE(expressao: string): string[] {
  const clausulas: string[] = [];
  let profundidade = 0;
  let inicio = 0;
  for (let i = 0; i < expressao.length; i++) {
    const c = expressao[i];
    if (c === "(") profundidade++;
    else if (c === ")") profundidade--;
    else if (profundidade === 0 && expressao.startsWith("&&", i)) {
      clausulas.push(expressao.slice(inicio, i));
      i++;
      inicio = i + 1;
    }
  }
  clausulas.push(expressao.slice(inicio));
  return clausulas;
}

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

const LETRA_OU_DIGITO = /[\p{L}\p{N}_.]/u;
const PALAVRA_INTERVALO = /^(?:entre|dentro\s+de)(?![\p{L}\p{N}_.])/iu;

/** Acha, fora de parênteses, a palavra `entre` / `dentro de` de uma cláusula de
 * intervalo (`<expr> entre <min> e <max>`). Exige borda de palavra. */
function encontrarIntervalo(expressao: string): { pos: number; tamanho: number } | null {
  let profundidade = 0;
  for (let i = 0; i < expressao.length; i++) {
    const c = expressao[i];
    if (c === "(") profundidade++;
    else if (c === ")") profundidade--;
    else if (profundidade === 0 && (i === 0 || !LETRA_OU_DIGITO.test(expressao[i - 1]))) {
      const match = PALAVRA_INTERVALO.exec(expressao.slice(i));
      if (match) return { pos: i, tamanho: match[0].length };
    }
  }
  return null;
}

/** Posição do conectivo `e` (palavra isolada, fora de parênteses) que separa
 * mínimo e máximo — `-1` se não houver. */
function encontrarConectivoE(expressao: string): number {
  let profundidade = 0;
  for (let i = 0; i < expressao.length; i++) {
    const c = expressao[i];
    if (c === "(") profundidade++;
    else if (c === ")") profundidade--;
    else if (
      profundidade === 0 &&
      (c === "e" || c === "E") &&
      (i === 0 || !LETRA_OU_DIGITO.test(expressao[i - 1])) &&
      (i === expressao.length - 1 || !LETRA_OU_DIGITO.test(expressao[i + 1]))
    ) {
      return i;
    }
  }
  return -1;
}

/** `<expr> entre <min> e <max>` — extremos inclusivos; se vierem invertidos
 * (`entre 2 e 1`) a faixa é a mesma, em vez de nunca bater. */
function avaliarClausulaIntervalo(
  expressao: string,
  intervalo: { pos: number; tamanho: number },
): ResultadoCondicao {
  const sintaxe = { erro: "Use: valor entre mínimo e máximo (ex: {IMC} entre 18.5 e 24.9)" };
  const valor = expressao.slice(0, intervalo.pos);
  const limites = expressao.slice(intervalo.pos + intervalo.tamanho);
  const separador = encontrarConectivoE(limites);
  if (separador === -1) return sintaxe;

  let numeros: number[];
  try {
    numeros = [
      avaliarExpressaoAritmetica(valor),
      avaliarExpressaoAritmetica(limites.slice(0, separador)),
      avaliarExpressaoAritmetica(limites.slice(separador + 1)),
    ];
  } catch {
    return { erro: "Condição inválida" };
  }
  if (!numeros.every(Number.isFinite)) {
    return { erro: "Não foi possível calcular a condição (divisão por zero)" };
  }
  const [x, a, b] = numeros;
  return { valor: x >= Math.min(a, b) && x <= Math.max(a, b) };
}

function avaliarClausulaComparador(expressao: string): ResultadoCondicao {
  const intervalo = encontrarIntervalo(expressao);
  if (intervalo) return avaliarClausulaIntervalo(expressao, intervalo);

  const comparador = encontrarComparador(expressao);
  if (!comparador) {
    return {
      erro: "A condição precisa de um comparador (<, <=, >, >=, ==, !=) ou de um intervalo (entre A e B)",
    };
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

/** Avalia a condição inteira — uma cláusula só, ou várias unidas por `&&`
 * (todas precisam ser verdadeiras). Para no primeiro erro/cláusula falsa. */
function avaliarCondicaoSubstituida(expressao: string): ResultadoCondicao {
  const clausulas = separarClausulasE(expressao);
  for (const clausula of clausulas) {
    const resultado = avaliarClausulaComparador(clausula);
    if ("erro" in resultado) return resultado;
    if (!resultado.valor) return { valor: false };
  }
  return { valor: true };
}

function validarSintaxeCondicao(formula: string): boolean {
  const substituida = canonizarAgregacoes(formula).replace(TOKEN_REGEX, "1");
  const resultado = avaliarCondicaoSubstituida(substituida);
  // Com `1` no lugar de cada referência, um `SE` de tabela de referência cai no
  // `1/0` final (nenhuma faixa bate) — não é erro de sintaxe, só valor não finito.
  return "valor" in resultado || resultado.erro.includes("divisão por zero");
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

  let expressao = canonizarAgregacoes(formula);
  for (const nome of referencias) {
    const valor = valoresPorTitulo.get(normalizarTitulo(nome))!;
    expressao = expressao.replace(
      new RegExp(`\\{\\s*${escapeRegExp(nome)}\\s*\\}`, "gi"),
      `(${valor})`,
    );
  }

  return avaliarCondicaoSubstituida(expressao);
}

/** Arredonda pra 1 casa decimal — resultado de CALCULADO já sai assim (não só
 * na exibição), pra facilitar escrever condição/fórmula encadeada em cima
 * dele sem precisar adivinhar quantas casas o cálculo anterior produziu. */
function arredondarUmaCasa(valor: number): number {
  return Math.round(valor * 10) / 10;
}

/**
 * Calcula uma fórmula contra os valores numéricos já resolvidos (chave =
 * `normalizarTitulo(titulo da coluna)`). Nunca lança — valor ausente/não
 * numérico ou divisão por zero viram `{ erro }` com mensagem pra exibir
 * junto ao campo calculado. O resultado é arredondado pra 1 casa decimal
 * (`arredondarUmaCasa`) antes de ser devolvido — vale tanto pra exibição
 * quanto pro valor usado em fórmulas/condições encadeadas.
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

  let expressao = canonizarAgregacoes(formula);
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

  return { valor: arredondarUmaCasa(resultado) };
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
 * Calcula as colunas CALCULADO (resolvendo dependências em qualquer ordem) e,
 * depois, as opções automáticas de MULTIPLA_ESCOLHA contra todos os valores
 * numéricos. Em seleção única, a primeira opção (na ordem de `opcoes`) cuja
 * condição bate vence; em múltipla, todas que baterem. Colunas de campo
 * repetível são ignoradas (nunca calculáveis nem referenciáveis).
 */
export function calcularColunas<L extends string | number = string | number>(
  colunas: ColunaCalculo[],
  valorBruto: (colunaId: string) => string | undefined,
  paciente?: DadosPacienteFormula | null,
  variaveis?: VariavelExame[],
  linhas?: FonteLinhas<L>,
): {
  calculados: Map<string, ResultadoFormula>;
  opcoesAutomaticas: Map<string, ResultadoOpcoesAutomaticas>;
  /** `{Soma pontuações}`; `undefined` se nenhuma coluna de pontuação foi respondida. */
  somaPontuacoes: number | undefined;
  /** Valores por título normalizado — o contexto de `calcularLinhasRepetiveis`. */
  valoresDoExame: Map<string, number>;
} {
  return calcularEscopo(
    colunas,
    valorBruto,
    variaveisDoPaciente(paciente),
    variaveis,
    false,
    linhas,
  );
}

/** As entradas dos campos repetíveis: a agregação precisa de todas. */
export type FonteLinhas<L extends string | number = string | number> = {
  linhasDoCampo: (campoId: string) => L[];
  valor: (colunaId: string, linha: L) => string | undefined;
};

/** Chave de um resultado por entrada em `calcularLinhasRepetiveis`. */
export function chaveLinha(colunaId: string, linha: string | number): string {
  return `${colunaId}::${linha}`;
}

/**
 * Calcula, entrada por entrada, as colunas CALCULADO e as opções automáticas de
 * campos repetíveis. Cada entrada enxerga as colunas dela mesma e os valores do
 * exame (`valoresDoExame`, de `calcularColunas`). Uma coluna da entrada tem
 * precedência sobre uma do exame com o mesmo nome, mesmo vazia. Os resultados
 * são indexados por `chaveLinha(colunaId, linha)`.
 */
export function calcularLinhasRepetiveis<L extends string | number>(
  colunas: ColunaCalculo[],
  linhasDoCampo: (campoId: string) => L[],
  valorBruto: (colunaId: string, linha: L) => string | undefined,
  valoresDoExame: Map<string, number>,
  variaveis?: VariavelExame[],
): {
  calculados: Map<string, ResultadoFormula>;
  opcoesAutomaticas: Map<string, ResultadoOpcoesAutomaticas>;
} {
  const colunasPorCampo = new Map<string, ColunaCalculo[]>();
  for (const coluna of colunas) {
    if (!coluna.repetivel || coluna.campoId === undefined) continue;
    const doCampo = colunasPorCampo.get(coluna.campoId);
    if (doCampo) doCampo.push(coluna);
    else colunasPorCampo.set(coluna.campoId, [coluna]);
  }

  const calculados = new Map<string, ResultadoFormula>();
  const opcoesAutomaticas = new Map<string, ResultadoOpcoesAutomaticas>();
  for (const [campoId, doCampo] of colunasPorCampo) {
    if (!doCampo.some((c) => c.tipo === "CALCULADO" || temOpcoesAutomaticas(c))) continue;
    const daEntrada = doCampo.map((c) => ({ ...c, repetivel: false }));
    for (const linha of linhasDoCampo(campoId)) {
      const resultado = calcularEscopo(
        daEntrada,
        (colunaId) => valorBruto(colunaId, linha),
        new Map(valoresDoExame),
        variaveis,
        true,
      );
      for (const [colunaId, valor] of resultado.calculados) {
        calculados.set(chaveLinha(colunaId, linha), valor);
      }
      for (const [colunaId, valor] of resultado.opcoesAutomaticas) {
        opcoesAutomaticas.set(chaveLinha(colunaId, linha), valor);
      }
    }
  }
  return { calculados, opcoesAutomaticas };
}

/** Motor de `calcularColunas`. Em `escopoDeLinha`, `colunas` são as de uma entrada
 * e `valoresPorTitulo` já traz os valores do exame, inclusive `{Soma pontuações}`. */
function calcularEscopo<L extends string | number>(
  colunas: ColunaCalculo[],
  valorBruto: (colunaId: string) => string | undefined,
  valoresPorTitulo: Map<string, number>,
  variaveis: VariavelExame[] | undefined,
  escopoDeLinha: boolean,
  linhas?: FonteLinhas<L>,
): {
  calculados: Map<string, ResultadoFormula>;
  opcoesAutomaticas: Map<string, ResultadoOpcoesAutomaticas>;
  somaPontuacoes: number | undefined;
  valoresDoExame: Map<string, number>;
} {
  // Pontos de cada coluna de pontuação já respondida (id → pontos) e, por nome,
  // as colunas do exame (uma coluna chamada "Soma pontuações" tem precedência).
  const pontosPorColuna = new Map<string, number>();
  const chavesDeColunas = new Set(
    colunas.filter((c) => !c.repetivel).map((c) => normalizarTitulo(c.titulo)),
  );
  const pontuadasAutomaticas = colunas.filter(
    (c) => !c.repetivel && ehPontuada(c) && temOpcoesAutomaticas(c),
  );

  function somaAtual(): number | undefined {
    if (pontosPorColuna.size === 0) return undefined;
    let soma = 0;
    for (const pontos of pontosPorColuna.values()) soma += pontos;
    return soma;
  }

  function publicarSoma() {
    if (escopoDeLinha) return;
    const soma = somaAtual();
    for (const chave of CHAVES_SOMA_PONTUACOES) {
      if (chavesDeColunas.has(chave)) continue;
      if (soma === undefined) valoresPorTitulo.delete(chave);
      else valoresPorTitulo.set(chave, soma);
    }
  }
  const calculados = new Map<string, ResultadoFormula>();
  const opcoesAutomaticas = new Map<string, ResultadoOpcoesAutomaticas>();

  // 1) Folhas (NUMERO digitado; MULTIPLA_ESCOLHA pontuada manual, pela opção
  // marcada) e índice, por nome, dos nós derivados (CALCULADO e MULTIPLA_ESCOLHA
  // automática) — que são resolvidos sob demanda no passo 2.
  const derivadasPorChave = new Map<string, ColunaCalculo>();
  for (const coluna of colunas) {
    if (coluna.repetivel) continue;
    const chave = normalizarTitulo(coluna.titulo);
    if (!chave) continue;
    if (escopoDeLinha && ehReferenciavel(coluna)) valoresPorTitulo.delete(chave);
    if (coluna.tipo === "NUMERO") {
      const bruto = valorBruto(coluna.id);
      const numero = bruto === undefined || bruto === "" ? NaN : Number(bruto);
      if (Number.isFinite(numero)) valoresPorTitulo.set(chave, numero);
    } else if (coluna.tipo === "CALCULADO") {
      if (!derivadasPorChave.has(chave)) derivadasPorChave.set(chave, coluna);
    } else if (ehPontuada(coluna)) {
      if (temOpcoesAutomaticas(coluna)) {
        if (!derivadasPorChave.has(chave)) derivadasPorChave.set(chave, coluna);
      } else {
        const pontos = somarPontuacao(
          selecionadasDoValor(valorBruto(coluna.id) ?? "", !!coluna.multiplaSelecao),
          coluna.pontuacoes ?? [],
        );
        if (pontos !== undefined) {
          valoresPorTitulo.set(chave, pontos);
          pontosPorColuna.set(coluna.id, pontos);
        }
      }
    }
  }

  // 2) Derivadas sob demanda: antes de avaliar uma, resolve as derivadas que
  // ela referencia (em qualquer posição) — uma CALCULADO pode somar pontuações
  // de colunas automáticas, e uma coluna automática pode classificar uma
  // CALCULADO. Ciclo é barrado no cadastro; se existir mesmo assim, a coluna
  // do ciclo fica sem valor ("Preencha ...").
  const resolvidas = new Set<string>();
  const emAndamento = new Set<string>();

  /** `locais`: nomes que são colunas da própria entrada (ao calcular um campo
   * repetível para uma agregação), que não são dependências no exame. */
  function resolverDependencias(
    formulas: string[],
    propria?: ColunaCalculo,
    locais?: Set<string>,
  ) {
    for (const formula of formulas) {
      // `{Soma pontuações}` depende de TODAS as colunas de pontuação automáticas.
      if (referenciaSomaPontuacoes(formula)) {
        for (const pontuada of pontuadasAutomaticas) {
          if (pontuada !== propria) resolver(pontuada);
        }
      }
      for (const nome of extrairReferencias(formula)) {
        resolverAgregacao(nome);
        if (locais?.has(normalizarTitulo(nome))) continue;
        const dependencia = derivadasPorChave.get(normalizarTitulo(nome));
        if (dependencia && dependencia !== propria) resolver(dependencia);
      }
    }
    publicarSoma();
  }

  const agregacoesVistas = new Set<string>();
  const camposEmAndamento = new Set<string>();

  /** Deixa o valor da agregação em `valoresPorTitulo`. Numa entrada não faz nada:
   * as agregações já chegam prontas em `valoresDoExame`. */
  function resolverAgregacao(nome: string) {
    const agregacao = parseAgregacao(nome);
    const chave = normalizarTitulo(nome);
    if (escopoDeLinha || !agregacao || agregacoesVistas.has(chave)) return;
    agregacoesVistas.add(chave);

    const numeros = colunasDaAgregacao(colunas, agregacao.alvo).flatMap((coluna) =>
      coluna.repetivel ? valoresDasEntradas(coluna) : valorDaColuna(coluna),
    );
    const resultado = aplicarAgregacao(agregacao.funcao, numeros);
    if (resultado !== undefined) valoresPorTitulo.set(chave, resultado);
  }

  function numeroDoBruto(bruto: string | undefined): number[] {
    const numero = bruto === undefined || bruto === "" ? NaN : Number(bruto);
    return Number.isFinite(numero) ? [numero] : [];
  }

  function valorDaColuna(coluna: ColunaCalculo): number[] {
    if (coluna.tipo === "NUMERO") return numeroDoBruto(valorBruto(coluna.id));
    if (coluna.tipo === "CALCULADO" || temOpcoesAutomaticas(coluna)) resolver(coluna);
    if (coluna.tipo === "CALCULADO") {
      const resultado = calculados.get(coluna.id);
      return resultado && "valor" in resultado ? [resultado.valor] : [];
    }
    const pontos = pontosPorColuna.get(coluna.id);
    return pontos === undefined ? [] : [pontos];
  }

  /** Entrada sem valor (ou com cálculo incompleto) fica de fora da agregação. */
  function valoresDasEntradas(coluna: ColunaCalculo): number[] {
    if (!linhas || coluna.campoId === undefined) return [];
    const entradas = linhas.linhasDoCampo(coluna.campoId);
    if (coluna.tipo === "NUMERO") {
      return entradas.flatMap((linha) => numeroDoBruto(linhas.valor(coluna.id, linha)));
    }
    const calculadosDoCampo = calcularCampo(coluna.campoId);
    return entradas.flatMap((linha) => {
      const resultado = calculadosDoCampo.get(chaveLinha(coluna.id, linha));
      return resultado && "valor" in resultado ? [resultado.valor] : [];
    });
  }

  function calcularCampo(campoId: string): Map<string, ResultadoFormula> {
    if (!linhas || camposEmAndamento.has(campoId)) return new Map();
    camposEmAndamento.add(campoId);
    const doCampo = colunas.filter((c) => c.repetivel && c.campoId === campoId);
    const locais = new Set(
      doCampo.filter(ehReferenciavel).map((c) => normalizarTitulo(c.titulo)),
    );
    resolverDependencias(
      doCampo.flatMap(formulasDaColuna).map((f) => expandirVariaveis(f, variaveis)),
      undefined,
      locais,
    );
    const { calculados: doCampoCalculados } = calcularLinhasRepetiveis(
      doCampo,
      linhas.linhasDoCampo,
      linhas.valor,
      valoresPorTitulo,
      variaveis,
    );
    camposEmAndamento.delete(campoId);
    return doCampoCalculados;
  }

  function resolver(coluna: ColunaCalculo) {
    if (resolvidas.has(coluna.id) || emAndamento.has(coluna.id)) return;
    emAndamento.add(coluna.id);

    if (coluna.tipo === "CALCULADO") {
      const formula = expandirVariaveis(coluna.formula ?? "", variaveis);
      resolverDependencias([formula], coluna);
      const resultado = avaliarFormula(formula, valoresPorTitulo);
      calculados.set(coluna.id, resultado);
      if ("valor" in resultado) {
        valoresPorTitulo.set(normalizarTitulo(coluna.titulo), resultado.valor);
      }
    } else {
      // MULTIPLA_ESCOLHA automática: todas as opções têm condição (tudo ou nada).
      const formulaPorOpcao = new Map(
        (coluna.opcoesCondicionais ?? []).map((c) => [c.opcao, c.formula]),
      );
      const expandidas = new Map<string, string>();
      for (const [opcao, formula] of formulaPorOpcao) {
        expandidas.set(opcao, expandirVariaveis(formula, variaveis));
      }
      resolverDependencias([...expandidas.values()], coluna);

      const selecionadas: string[] = [];
      const erros: Record<string, string> = {};
      for (const opcao of coluna.opcoes ?? []) {
        const formula = expandidas.get(opcao);
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

      // Pontuação só vale com a seleção completa: com erro em alguma opção (valor
      // de origem faltando) a seleção é parcial e a soma enganaria.
      if (ehPontuada(coluna) && Object.keys(erros).length === 0) {
        const pontos = somarPontuacao(selecionadas, coluna.pontuacoes ?? []);
        if (pontos !== undefined) {
          valoresPorTitulo.set(normalizarTitulo(coluna.titulo), pontos);
          pontosPorColuna.set(coluna.id, pontos);
        }
      }
    }

    emAndamento.delete(coluna.id);
    resolvidas.add(coluna.id);
  }

  for (const coluna of colunas) {
    if (coluna.repetivel || !normalizarTitulo(coluna.titulo)) continue;
    if (coluna.tipo === "CALCULADO" || temOpcoesAutomaticas(coluna)) resolver(coluna);
  }

  // Agregações citadas por fórmulas de campo repetível: as entradas só leem o valor.
  for (const coluna of colunas) {
    for (const formula of formulasDaColuna(coluna)) {
      for (const nome of extrairReferencias(expandirVariaveis(formula, variaveis))) {
        resolverAgregacao(nome);
      }
    }
  }

  // Sem coluna derivada ninguém publicou a soma, e as entradas ainda podem usá-la.
  publicarSoma();

  return {
    calculados,
    opcoesAutomaticas,
    somaPontuacoes: somaAtual(),
    valoresDoExame: valoresPorTitulo,
  };
}

export function calcularColunasFormula<L extends string | number = string | number>(
  colunas: ColunaCalculo[],
  valorBruto: (colunaId: string) => string | undefined,
  paciente?: DadosPacienteFormula | null,
  variaveis?: VariavelExame[],
  linhas?: FonteLinhas<L>,
): Map<string, ResultadoFormula> {
  return calcularColunas(colunas, valorBruto, paciente, variaveis, linhas).calculados;
}

/** Erro de `validarFormulasDoExame` com a posição exata da coluna (índice em
 * `colunas`, na mesma ordem de documento passada pro validador) e, quando o
 * problema é de uma opção específica de MULTIPLA_ESCOLHA, o índice dela em
 * `coluna.opcoesCondicionais` — usado pela tela de cadastro pra rolar até o
 * campo problemático em vez de só mostrar a mensagem solta. */
export type ErroValidacaoFormula = {
  mensagem: string;
  /** `-1` quando o erro é de uma variável (ver `variavelIndex`). */
  colunaIndex: number;
  opcaoIndex?: number;
  /** Onde, dentro da coluna, está o `opcaoIndex` (padrão: `opcoesCondicionais`). */
  opcaoCampo?: "opcoesCondicionais" | "pontuacoes";
  variavelIndex?: number;
};

const MSG_AGREGACAO_SEM_COLUNA =
  "nenhuma coluna numérica foi encontrada (confira os nomes: SOMA({Seção > Coluna}) ou SOMA({Coluna}))";

/** Valida as variáveis do exame: nome único e sem conflito (colunas numéricas,
 * Idade/Sexo), fórmula preenchida, referências existentes, sem ciclo e com
 * sintaxe válida. A ordem das colunas não importa. */
function validarVariaveis(
  variaveis: VariavelExame[],
  colunas: ColunaValidavel[],
): ErroValidacaoFormula | null {
  const erro = (mensagem: string, variavelIndex: number): ErroValidacaoFormula => ({
    mensagem,
    colunaIndex: -1,
    variavelIndex,
  });
  const nomesColunas = new Set(
    colunas
      .filter((c) => ehReferenciavel(c) && !c.repetivel)
      .map((c) => normalizarTitulo(c.titulo)),
  );
  // Só para existência: a variável pode citar coluna repetível, e quem a usa fora
  // do campo é barrado ao validar a fórmula já expandida.
  const nomesDeEntrada = new Set(
    colunas
      .filter((c) => ehReferenciavel(c) && c.repetivel)
      .map((c) => normalizarTitulo(c.titulo)),
  );
  const nomesPaciente = new Set([
    ...VARIAVEIS_PACIENTE.map(normalizarTitulo),
    ...CHAVES_SOMA_PONTUACOES,
  ]);
  const vistos = new Set<string>();

  for (let i = 0; i < variaveis.length; i++) {
    const nome = variaveis[i].nome.trim();
    const chave = normalizarTitulo(nome);
    if (!nome) return erro("Toda variável precisa de um nome", i);
    if (/[{}]/.test(nome)) {
      return erro(`O nome da variável "${nome}" não pode conter { ou }`, i);
    }
    if (vistos.has(chave)) return erro(`Já existe uma variável chamada "${nome}"`, i);
    vistos.add(chave);
    if (nomesPaciente.has(chave)) {
      return erro(
        `"${nome}" já é uma variável do paciente ou do exame (Idade, Sexo, Soma pontuações) — escolha outro nome`,
        i,
      );
    }
    if (nomesColunas.has(chave)) {
      return erro(`"${nome}" já é o nome de uma coluna do exame — escolha outro nome`, i);
    }
  }

  const mapa = new Map(variaveis.map((v) => [normalizarTitulo(v.nome), v]));
  for (let i = 0; i < variaveis.length; i++) {
    const { nome, formula } = variaveis[i];
    if (!formula.trim()) return erro(`A variável "${nome}" precisa de uma fórmula ou valor`, i);
    for (const ref of extrairReferencias(formula)) {
      const chave = normalizarTitulo(ref);
      const agregacao = parseAgregacao(ref);
      if (agregacao) {
        if (colunasDaAgregacao(colunas, agregacao.alvo).length === 0) {
          return erro(`A variável "${nome}" usa ${ref}, mas ${MSG_AGREGACAO_SEM_COLUNA}`, i);
        }
        continue;
      }
      if (
        !mapa.has(chave) &&
        !nomesColunas.has(chave) &&
        !nomesDeEntrada.has(chave) &&
        !nomesPaciente.has(chave)
      ) {
        return erro(`A variável "${nome}" referencia "${ref}", que não existe`, i);
      }
    }
  }

  // Ciclo: DFS por referências entre variáveis.
  const estado = new Map<string, 1 | 2>();
  function temCiclo(chave: string): boolean {
    if (estado.get(chave) === 2) return false;
    if (estado.get(chave) === 1) return true;
    estado.set(chave, 1);
    for (const ref of extrairReferencias(mapa.get(chave)!.formula)) {
      const k = normalizarTitulo(ref);
      if (mapa.has(k) && temCiclo(k)) return true;
    }
    estado.set(chave, 2);
    return false;
  }
  for (let i = 0; i < variaveis.length; i++) {
    if (temCiclo(normalizarTitulo(variaveis[i].nome))) {
      return erro(`A variável "${variaveis[i].nome}" depende dela mesma (ciclo)`, i);
    }
  }

  for (let i = 0; i < variaveis.length; i++) {
    if (!validarSintaxe(expandirVariaveis(variaveis[i].formula, variaveis))) {
      return erro(`A fórmula da variável "${variaveis[i].nome}" tem um erro de sintaxe`, i);
    }
  }
  return null;
}

/**
 * Valida a estrutura de fórmulas do exame inteiro (cadastro): fórmula
 * obrigatória, referências a colunas existentes (em qualquer posição; coluna de
 * campo repetível só dentro do próprio campo), sem ciclo entre calculadas, nomes
 * de coluna numérica/calculada únicos, sintaxe válida. `colunas` vem em ordem de
 * documento (seção → campo → coluna) — só para mapear o erro à posição.
 * Devolve o primeiro erro encontrado (mensagem + posição), ou `null` se tudo ok.
 */
export function validarFormulasDoExameDetalhado(
  colunas: ColunaValidavel[],
  variaveis: VariavelExame[] = [],
): ErroValidacaoFormula | null {
  const erroVariavel = validarVariaveis(variaveis, colunas);
  if (erroVariavel) return erroVariavel;

  // Referenciável = variável do paciente + toda coluna numérica/calculada de
  // campo não-repetível, em qualquer posição. O paciente não entra na checagem
  // de nome duplicado (`nomesDeColunas`).
  const disponiveis = new Set<string>(VARIAVEIS_PACIENTE.map(normalizarTitulo));
  // `{Soma pontuações}` só existe se o exame tem alguma coluna de pontuação.
  if (colunas.some((c) => ehPontuada(c) && !c.repetivel)) {
    for (const chave of CHAVES_SOMA_PONTUACOES) disponiveis.add(chave);
  }
  for (const c of colunas) {
    const chave = normalizarTitulo(c.titulo);
    if (ehReferenciavel(c) && !c.repetivel && chave) disponiveis.add(chave);
  }
  const nomesDeColunas = new Set<string>();

  // Colunas referenciáveis de cada campo repetível: só valem dentro do campo.
  const nomesDaEntrada = new Map<string | undefined, Set<string>>();
  for (const c of colunas) {
    const chave = normalizarTitulo(c.titulo);
    if (!c.repetivel || !ehReferenciavel(c) || !chave) continue;
    const nomes = nomesDaEntrada.get(c.campoId) ?? new Set<string>();
    nomes.add(chave);
    nomesDaEntrada.set(c.campoId, nomes);
  }
  function referenciaExiste(coluna: ColunaValidavel, nome: string): boolean {
    const agregacao = parseAgregacao(nome);
    if (agregacao) return colunasDaAgregacao(colunas, agregacao.alvo).length > 0;
    const chave = normalizarTitulo(nome);
    return (
      disponiveis.has(chave) ||
      (coluna.repetivel && !!nomesDaEntrada.get(coluna.campoId)?.has(chave))
    );
  }

  // Campo repetível com fórmula: seus nomes viram chave de referência. Campo sem
  // fórmula não é checado, para não barrar exames já cadastrados.
  const camposComFormula = new Set(
    colunas
      .filter((c) => c.repetivel && (c.tipo === "CALCULADO" || temOpcoesAutomaticas(c)))
      .map((c) => c.campoId),
  );
  const nomesVariaveis = new Set(variaveis.map((v) => normalizarTitulo(v.nome)));
  const nomesVistosNoCampo = new Map<string | undefined, Set<string>>();

  for (let colunaIndex = 0; colunaIndex < colunas.length; colunaIndex++) {
    const coluna = colunas[colunaIndex];
    if (coluna.tipo === "CALCULADO") {
      const formula = (coluna.formula ?? "").trim();
      if (!formula) {
        return {
          mensagem: `A coluna calculada "${coluna.titulo}" precisa de uma fórmula`,
          colunaIndex,
        };
      }

      if (extrairReferencias(formula).length === 0) {
        return {
          mensagem: `A fórmula da coluna "${coluna.titulo}" não referencia nenhuma coluna`,
          colunaIndex,
        };
      }

      const formulaExpandida = expandirVariaveis(formula, variaveis);
      for (const nome of extrairReferencias(formulaExpandida)) {
        if (normalizarTitulo(nome) === normalizarTitulo(coluna.titulo)) {
          return {
            mensagem: `A fórmula da coluna "${coluna.titulo}" não pode referenciar ela mesma`,
            colunaIndex,
          };
        }
        if (ehSomaPontuacoes(nome) && !referenciaExiste(coluna, nome)) {
          return {
            mensagem: `A fórmula da coluna "${coluna.titulo}" usa "${VARIAVEL_SOMA_PONTUACOES}", mas nenhuma coluna do exame está marcada como pontuação`,
            colunaIndex,
          };
        }
        if (parseAgregacao(nome) && !referenciaExiste(coluna, nome)) {
          return {
            mensagem: `A fórmula da coluna "${coluna.titulo}" usa ${nome}, mas ${MSG_AGREGACAO_SEM_COLUNA}`,
            colunaIndex,
          };
        }
        if (!referenciaExiste(coluna, nome)) {
          return {
            mensagem: `A fórmula da coluna "${coluna.titulo}" referencia "${nome}", que não existe neste exame (colunas de campos com múltiplas entradas só podem ser referenciadas dentro do próprio campo)`,
            colunaIndex,
          };
        }
      }

      if (!validarSintaxe(formulaExpandida)) {
        return {
          mensagem: `A fórmula da coluna "${coluna.titulo}" tem um erro de sintaxe`,
          colunaIndex,
        };
      }
    }

    if (ehPontuada(coluna)) {
      if (coluna.repetivel) {
        return {
          mensagem: `A coluna de pontuação "${coluna.titulo}" não pode estar em um campo com múltiplas entradas`,
          colunaIndex,
        };
      }
      const opcoes = coluna.opcoes ?? [];
      const pontuadas = coluna.pontuacoes ?? [];
      for (let opcaoIndex = 0; opcaoIndex < opcoes.length; opcaoIndex++) {
        const pontuacao = pontuadas.find((p) => p.opcao === opcoes[opcaoIndex]);
        if (!pontuacao || !Number.isFinite(pontuacao.pontos)) {
          return {
            mensagem: `A opção "${opcoes[opcaoIndex]}" da coluna "${coluna.titulo}" precisa de uma pontuação numérica (ou desligue "funciona como pontuação")`,
            colunaIndex,
            opcaoIndex,
            opcaoCampo: "pontuacoes",
          };
        }
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
        return {
          mensagem: `A coluna "${coluna.titulo}" precisa de uma condição para TODAS as opções (ou nenhuma) — não dá pra deixar só parte automática`,
          colunaIndex,
        };
      }

      for (
        let opcaoIndex = 0;
        opcaoIndex < coluna.opcoesCondicionais.length;
        opcaoIndex++
      ) {
        const { opcao, formula } = coluna.opcoesCondicionais[opcaoIndex];
        const f = formula.trim();
        if (!f) {
          return {
            mensagem: `A condição da opção "${opcao}" da coluna "${coluna.titulo}" está vazia`,
            colunaIndex,
            opcaoIndex,
          };
        }

        if (extrairReferencias(f).length === 0) {
          return {
            mensagem: `A condição da opção "${opcao}" da coluna "${coluna.titulo}" não referencia nenhuma coluna`,
            colunaIndex,
            opcaoIndex,
          };
        }

        const condicaoExpandida = expandirVariaveis(f, variaveis);
        for (const nome of extrairReferencias(condicaoExpandida)) {
          if (normalizarTitulo(nome) === normalizarTitulo(coluna.titulo)) {
            return {
              mensagem: `A condição da opção "${opcao}" da coluna "${coluna.titulo}" não pode referenciar a própria coluna`,
              colunaIndex,
              opcaoIndex,
            };
          }
          if (ehSomaPontuacoes(nome)) {
            if (!referenciaExiste(coluna, nome)) {
              return {
                mensagem: `A condição da opção "${opcao}" da coluna "${coluna.titulo}" usa "${VARIAVEL_SOMA_PONTUACOES}", mas nenhuma coluna do exame está marcada como pontuação`,
                colunaIndex,
                opcaoIndex,
              };
            }
            if (ehPontuada(coluna)) {
              return {
                mensagem: `A condição da opção "${opcao}" da coluna "${coluna.titulo}" não pode usar "${VARIAVEL_SOMA_PONTUACOES}" — ela é uma coluna de pontuação e entra nessa soma (ciclo)`,
                colunaIndex,
                opcaoIndex,
              };
            }
          }
          if (parseAgregacao(nome) && !referenciaExiste(coluna, nome)) {
            return {
              mensagem: `A condição da opção "${opcao}" da coluna "${coluna.titulo}" usa ${nome}, mas ${MSG_AGREGACAO_SEM_COLUNA}`,
              colunaIndex,
              opcaoIndex,
            };
          }
          if (!referenciaExiste(coluna, nome)) {
            return {
              mensagem: `A condição da opção "${opcao}" da coluna "${coluna.titulo}" referencia "${nome}", que não existe neste exame (colunas de campos com múltiplas entradas só podem ser referenciadas dentro do próprio campo)`,
              colunaIndex,
              opcaoIndex,
            };
          }
        }

        if (!validarSintaxeCondicao(condicaoExpandida)) {
          return {
            mensagem: `A condição da opção "${opcao}" da coluna "${coluna.titulo}" tem um erro de sintaxe (use um comparador: <, <=, >, >=, ==, != ou um intervalo: entre A e B)`,
            colunaIndex,
            opcaoIndex,
          };
        }
      }
    }

    if (ehReferenciavel(coluna) && !coluna.repetivel) {
      const chave = normalizarTitulo(coluna.titulo);
      if (chave) {
        if (nomesDeColunas.has(chave)) {
          return {
            mensagem: `Já existe uma coluna numérica chamada "${coluna.titulo}" neste exame — use nomes únicos para referenciá-las em fórmulas`,
            colunaIndex,
          };
        }
        nomesDeColunas.add(chave);
      }
    }

    if (ehReferenciavel(coluna) && coluna.repetivel && camposComFormula.has(coluna.campoId)) {
      const chave = normalizarTitulo(coluna.titulo);
      if (chave) {
        const vistos = nomesVistosNoCampo.get(coluna.campoId) ?? new Set<string>();
        if (vistos.has(chave)) {
          return {
            mensagem: `Já existe uma coluna numérica chamada "${coluna.titulo}" neste campo — use nomes únicos para referenciá-las em fórmulas`,
            colunaIndex,
          };
        }
        vistos.add(chave);
        nomesVistosNoCampo.set(coluna.campoId, vistos);
        // A variável é expandida antes da coluna: a fórmula pegaria a variável.
        if (nomesVariaveis.has(chave)) {
          return {
            mensagem: `Já existe uma variável chamada "${coluna.titulo}" — use outro nome nesta coluna`,
            colunaIndex,
          };
        }
      }
    }
  }

  return validarCiclosEntreCalculadas(colunas, variaveis);
}

/** Calculada que depende (direta ou indiretamente) dela mesma — o cálculo
 * sob demanda não teria por onde começar. Uma agregação cruza escopos (coluna do
 * exame → entradas de um campo), por isso o grafo é um só. */
function validarCiclosEntreCalculadas(
  colunas: ColunaValidavel[],
  variaveis: VariavelExame[],
): ErroValidacaoFormula | null {
  const ehDerivada = (c: ColunaValidavel) =>
    c.tipo === "CALCULADO" || (ehPontuada(c) && temOpcoesAutomaticas(c));

  const indiceDe = new Map(colunas.map((c, i) => [c, i]));
  const derivadasDoExame = new Map<string, number>();
  const derivadasDoCampo = new Map<string, number>();
  const referenciaveisDoCampo = new Set<string>();
  const chaveNoCampo = (campoId: string | undefined, chave: string) => `${campoId}::${chave}`;
  const pontuadasAutomaticas: number[] = [];

  colunas.forEach((c, i) => {
    const chave = normalizarTitulo(c.titulo);
    if (!chave) return;
    if (c.repetivel) {
      if (ehReferenciavel(c)) referenciaveisDoCampo.add(chaveNoCampo(c.campoId, chave));
      if (ehDerivada(c) && !derivadasDoCampo.has(chaveNoCampo(c.campoId, chave))) {
        derivadasDoCampo.set(chaveNoCampo(c.campoId, chave), i);
      }
    } else if (ehDerivada(c) && !derivadasDoExame.has(chave)) {
      derivadasDoExame.set(chave, i);
    }
    if (ehPontuada(c) && temOpcoesAutomaticas(c) && !c.repetivel) pontuadasAutomaticas.push(i);
  });

  function destinos(coluna: ColunaValidavel, nome: string): number[] {
    if (ehSomaPontuacoes(nome)) return pontuadasAutomaticas;
    const agregacao = parseAgregacao(nome);
    if (agregacao) {
      return colunasDaAgregacao(colunas, agregacao.alvo)
        .filter(ehDerivada)
        .map((c) => indiceDe.get(c)!);
    }
    const chave = normalizarTitulo(nome);
    const noCampo = chaveNoCampo(coluna.campoId, chave);
    if (coluna.repetivel && referenciaveisDoCampo.has(noCampo)) {
      const destino = derivadasDoCampo.get(noCampo);
      return destino === undefined ? [] : [destino];
    }
    const destino = derivadasDoExame.get(chave);
    return destino === undefined ? [] : [destino];
  }

  const estado = new Map<number, 1 | 2>();
  function temCiclo(indice: number): boolean {
    if (estado.get(indice) === 2) return false;
    if (estado.get(indice) === 1) return true;
    estado.set(indice, 1);
    const coluna = colunas[indice];
    for (const formulaBruta of formulasDaColuna(coluna)) {
      const formula = expandirVariaveis(formulaBruta, variaveis);
      for (const nome of extrairReferencias(formula)) {
        for (const destino of destinos(coluna, nome)) {
          // `{Soma pontuações}` não conta a própria coluna (barrado à parte).
          if (ehSomaPontuacoes(nome) && destino === indice) continue;
          if (temCiclo(destino)) return true;
        }
      }
    }
    estado.set(indice, 2);
    return false;
  }

  for (let indice = 0; indice < colunas.length; indice++) {
    const coluna = colunas[indice];
    if (ehDerivada(coluna) && normalizarTitulo(coluna.titulo) && temCiclo(indice)) {
      return {
        mensagem: `A coluna "${coluna.titulo}" depende dela mesma por meio de outras colunas calculadas ou automáticas (ciclo)`,
        colunaIndex: indice,
      };
    }
  }
  return null;
}

/** Mesma validação de `validarFormulasDoExameDetalhado`, mas devolvendo só a
 * mensagem — mantido para quem só precisa do texto do erro (testes existentes,
 * usos futuros fora do formulário de cadastro). */
export function validarFormulasDoExame(
  colunas: ColunaValidavel[],
  variaveis: VariavelExame[] = [],
): string | null {
  return validarFormulasDoExameDetalhado(colunas, variaveis)?.mensagem ?? null;
}
