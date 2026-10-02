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
      return `(${expandir(definicao, [...pilha, chave])})`;
    });
  }
  return expandir(formula, []);
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

/** Parser recursivo simples de +,-,*,/,^,() sobre números literais — nunca `eval`. */
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

  function parsePrimario(): number {
    skipSpaces();
    if (/^se\s*\(/i.test(expressao.slice(pos))) return parseSe();
    if (expressao[pos] === "(") {
      pos++;
      const valor = parseExpressao();
      skipSpaces();
      if (expressao[pos] !== ")") throw new Error("Parêntese não fechado");
      pos++;
      return valor;
    }
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
    avaliarExpressaoAritmetica(formula.replace(TOKEN_REGEX, "1"));
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

function avaliarClausulaComparador(expressao: string): ResultadoCondicao {
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
export function calcularColunas(
  colunas: ColunaCalculo[],
  valorBruto: (colunaId: string) => string | undefined,
  paciente?: DadosPacienteFormula | null,
  variaveis?: VariavelExame[],
): {
  calculados: Map<string, ResultadoFormula>;
  opcoesAutomaticas: Map<string, ResultadoOpcoesAutomaticas>;
} {
  const valoresPorTitulo = variaveisDoPaciente(paciente);
  const calculados = new Map<string, ResultadoFormula>();
  const opcoesAutomaticas = new Map<string, ResultadoOpcoesAutomaticas>();

  // 1) Valores digitados (NUMERO) e índice das calculadas por nome.
  const calculadasPorChave = new Map<string, ColunaCalculo>();
  for (const coluna of colunas) {
    if (coluna.repetivel) continue;
    const chave = normalizarTitulo(coluna.titulo);
    if (!chave) continue;
    if (coluna.tipo === "NUMERO") {
      const bruto = valorBruto(coluna.id);
      const numero = bruto === undefined || bruto === "" ? NaN : Number(bruto);
      if (Number.isFinite(numero)) valoresPorTitulo.set(chave, numero);
    } else if (coluna.tipo === "CALCULADO" && !calculadasPorChave.has(chave)) {
      calculadasPorChave.set(chave, coluna);
    }
  }

  // 2) Calculadas sob demanda: antes de avaliar uma, resolve as calculadas que
  // ela referencia (em qualquer posição). Ciclo é barrado no cadastro; se
  // existir mesmo assim, a coluna do ciclo fica sem valor ("Preencha ...").
  const emAndamento = new Set<string>();
  function resolver(coluna: ColunaCalculo) {
    if (calculados.has(coluna.id) || emAndamento.has(coluna.id)) return;
    emAndamento.add(coluna.id);
    const formula = expandirVariaveis(coluna.formula ?? "", variaveis);
    for (const nome of extrairReferencias(formula)) {
      const dependencia = calculadasPorChave.get(normalizarTitulo(nome));
      if (dependencia && dependencia !== coluna) resolver(dependencia);
    }
    const resultado = avaliarFormula(formula, valoresPorTitulo);
    calculados.set(coluna.id, resultado);
    if ("valor" in resultado) {
      valoresPorTitulo.set(normalizarTitulo(coluna.titulo), resultado.valor);
    }
    emAndamento.delete(coluna.id);
  }
  for (const coluna of colunas) {
    if (coluna.repetivel || coluna.tipo !== "CALCULADO") continue;
    if (!normalizarTitulo(coluna.titulo)) continue;
    resolver(coluna);
  }

  // 3) Opções automáticas, já com todos os valores numéricos resolvidos.
  for (const coluna of colunas) {
    if (coluna.repetivel) continue;
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
        const resultado = avaliarCondicaoOpcao(
          expandirVariaveis(formula, variaveis),
          valoresPorTitulo,
        );
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
  paciente?: DadosPacienteFormula | null,
  variaveis?: VariavelExame[],
): Map<string, ResultadoFormula> {
  return calcularColunas(colunas, valorBruto, paciente, variaveis).calculados;
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
  variavelIndex?: number;
};

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
      .filter((c) => TIPOS_REFERENCIAVEIS.has(c.tipo) && !c.repetivel)
      .map((c) => normalizarTitulo(c.titulo)),
  );
  const nomesPaciente = new Set(VARIAVEIS_PACIENTE.map(normalizarTitulo));
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
      return erro(`"${nome}" já é uma variável do paciente — escolha outro nome`, i);
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
      if (!mapa.has(chave) && !nomesColunas.has(chave) && !nomesPaciente.has(chave)) {
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
 * obrigatória, só em campo não-repetível, referências a colunas existentes
 * (em qualquer posição), sem ciclo entre calculadas, nomes de coluna
 * numérica/calculada únicos, sintaxe válida. `colunas` vem em ordem de
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
  for (const c of colunas) {
    const chave = normalizarTitulo(c.titulo);
    if (TIPOS_REFERENCIAVEIS.has(c.tipo) && !c.repetivel && chave) disponiveis.add(chave);
  }
  const nomesDeColunas = new Set<string>();

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
      if (coluna.repetivel) {
        return {
          mensagem: `A coluna calculada "${coluna.titulo}" não pode estar em um campo com múltiplas entradas`,
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
        if (!disponiveis.has(normalizarTitulo(nome))) {
          return {
            mensagem: `A fórmula da coluna "${coluna.titulo}" referencia "${nome}", que não existe neste exame (colunas de campos com múltiplas entradas não podem ser referenciadas)`,
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
          if (!disponiveis.has(normalizarTitulo(nome))) {
            return {
              mensagem: `A condição da opção "${opcao}" da coluna "${coluna.titulo}" referencia "${nome}", que não existe neste exame (colunas de campos com múltiplas entradas não podem ser referenciadas)`,
              colunaIndex,
              opcaoIndex,
            };
          }
        }

        if (!validarSintaxeCondicao(condicaoExpandida)) {
          return {
            mensagem: `A condição da opção "${opcao}" da coluna "${coluna.titulo}" tem um erro de sintaxe (use um comparador: <, <=, >, >=, ==, !=)`,
            colunaIndex,
            opcaoIndex,
          };
        }
      }
    }

    if (TIPOS_REFERENCIAVEIS.has(coluna.tipo) && !coluna.repetivel) {
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
  }

  return validarCiclosEntreCalculadas(colunas, variaveis);
}

/** Calculada que depende (direta ou indiretamente) dela mesma — o cálculo
 * sob demanda não teria por onde começar. */
function validarCiclosEntreCalculadas(
  colunas: ColunaValidavel[],
  variaveis: VariavelExame[],
): ErroValidacaoFormula | null {
  const indicePorChave = new Map<string, number>();
  colunas.forEach((c, i) => {
    const chave = normalizarTitulo(c.titulo);
    if (c.tipo === "CALCULADO" && !c.repetivel && chave && !indicePorChave.has(chave)) {
      indicePorChave.set(chave, i);
    }
  });

  const estado = new Map<number, 1 | 2>();
  function temCiclo(indice: number): boolean {
    if (estado.get(indice) === 2) return false;
    if (estado.get(indice) === 1) return true;
    estado.set(indice, 1);
    const formula = expandirVariaveis(colunas[indice].formula ?? "", variaveis);
    for (const nome of extrairReferencias(formula)) {
      const destino = indicePorChave.get(normalizarTitulo(nome));
      if (destino !== undefined && temCiclo(destino)) return true;
    }
    estado.set(indice, 2);
    return false;
  }

  for (const indice of indicePorChave.values()) {
    if (temCiclo(indice)) {
      return {
        mensagem: `A coluna calculada "${colunas[indice].titulo}" depende dela mesma por meio de outras colunas calculadas (ciclo)`,
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
