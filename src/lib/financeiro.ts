/**
 * Agregações da análise financeira do dashboard (lógica pura, sem Prisma).
 *
 * Recebe as cobranças já lidas do banco (`CobrancaLinha[]`) e a data "agora", e
 * devolve tudo que a aba Financeiro precisa: receita por mês, split por modalidade
 * (Fisioterapia x Educação Física x Combinado x Avulso), a receber nos próximos
 * meses e rankings de planos/pacientes.
 *
 * Todo bucketing por mês é feito no fuso da clínica (America/Sao_Paulo) via `Intl`,
 * nunca com `getMonth()` — ver CLAUDE.md. Os edge cases (virada de mês/ano, cobrança
 * perto da meia-noite UTC) são cobertos por `financeiro.test.ts`.
 */
import { inicioDoDia } from "./datas-brasilia";

const TZ = "America/Sao_Paulo";

export type CategoriaReceita =
  | "FISIOTERAPIA"
  | "EDUCACAO_FISICA"
  | "COMBINADO"
  | "AVULSO";

export const CATEGORIAS_RECEITA: CategoriaReceita[] = [
  "FISIOTERAPIA",
  "EDUCACAO_FISICA",
  "COMBINADO",
  "AVULSO",
];

export const LABEL_CATEGORIA_RECEITA: Record<CategoriaReceita, string> = {
  FISIOTERAPIA: "Fisioterapia",
  EDUCACAO_FISICA: "Educação Física",
  COMBINADO: "Combinado",
  AVULSO: "Avulso",
};

/** Cores alinhadas ao design system (azul e âmbar da marca via --chart-1/2). */
export const COR_CATEGORIA_RECEITA: Record<CategoriaReceita, string> = {
  FISIOTERAPIA: "var(--chart-1)",
  EDUCACAO_FISICA: "var(--chart-2)",
  COMBINADO: "#7c3aed",
  AVULSO: "var(--muted-foreground)",
};

/** null/[] → AVULSO (cobrança sem plano); 1 tipo → esse; ≥2 tipos → COMBINADO. */
export function categoriaReceita(
  tipos: string[] | null | undefined,
): CategoriaReceita {
  if (!tipos || tipos.length === 0) return "AVULSO";
  if (tipos.length >= 2) return "COMBINADO";
  return tipos[0] === "EDUCACAO_FISICA" ? "EDUCACAO_FISICA" : "FISIOTERAPIA";
}

/** "YYYY-MM" do instante no fuso da clínica. */
export function mesReferencia(d: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  })
    .format(d)
    .slice(0, 7);
}

/** Rótulo curto pt-BR ("jan/25") a partir de "YYYY-MM". */
export function rotuloMes(mesRef: string): string {
  const [ano, mes] = mesRef.split("-").map(Number);
  const nome = new Intl.DateTimeFormat("pt-BR", {
    timeZone: TZ,
    month: "short",
  })
    .format(new Date(Date.UTC(ano, mes - 1, 15)))
    .replace(".", "");
  return `${nome}/${String(ano).slice(-2)}`;
}

/**
 * `n` refs "YYYY-MM" ancoradas no mês de `de`.
 * - "passado": termina no mês de `de` (ordem cronológica, mais antigo primeiro);
 * - "futuro": começa no mês de `de` (mês atual + seguintes).
 */
export function sequenciaMeses(
  de: Date,
  n: number,
  direcao: "passado" | "futuro",
): string[] {
  const [ano, mes] = mesReferencia(de).split("-").map(Number);
  const baseIndex = ano * 12 + (mes - 1);
  return Array.from({ length: n }, (_, i) => {
    const offset = direcao === "futuro" ? i : -(n - 1 - i);
    const total = baseIndex + offset;
    const y = Math.floor(total / 12);
    const m = (total % 12) + 1;
    return `${String(y).padStart(4, "0")}-${String(m).padStart(2, "0")}`;
  });
}

export type CobrancaLinha = {
  valor: number;
  status: "PENDENTE" | "PAGO";
  pagoEm: Date | null;
  vencimento: Date;
  planoNome: string;
  pacienteId: string;
  pacienteNome: string;
  /** planoAtribuicao.plano.tipos — null para cobrança avulsa. */
  tipos: string[] | null;
};

export type SerieModalidadeMes = { mes: string; label: string } & Record<
  CategoriaReceita,
  number
>;

export type AnaliseFinanceira = {
  kpis: {
    recebidoMes: number;
    aReceberMes: number;
    totalAtrasado: number;
    ticketMedio: number;
    recebido12m: number;
  };
  receitaPorMes: { mes: string; label: string; recebido: number; qtd: number }[];
  receitaPorModalidadeMes: {
    categoria: CategoriaReceita;
    label: string;
    valor: number;
    pct: number;
  }[];
  receitaModalidadePorMes: SerieModalidadeMes[];
  aReceberPorMes: { mes: string; label: string; valor: number; qtd: number }[];
  topPlanos: { nome: string; valor: number; qtd: number }[];
  topPacientes: { pacienteId: string; nome: string; valor: number }[];
};

const cent = (n: number) => Math.round(n * 100) / 100;
const soma = (ns: number[]) => ns.reduce((a, b) => a + b, 0);

export function analisarFinanceiro(
  linhas: CobrancaLinha[],
  agora: Date = new Date(),
): AnaliseFinanceira {
  const mesAtual = mesReferencia(agora);
  const meses12 = sequenciaMeses(agora, 12, "passado");
  const meses6 = sequenciaMeses(agora, 6, "passado");
  const mesesFuturos = sequenciaMeses(agora, 6, "futuro");
  const hoje = inicioDoDia(agora);

  const pagas = linhas.filter(
    (l): l is CobrancaLinha & { pagoEm: Date } =>
      l.status === "PAGO" && l.pagoEm != null,
  );
  const pendentes = linhas.filter((l) => l.status === "PENDENTE");

  // Receita realizada por mês (12 meses)
  const recebidoMap = new Map<string, { recebido: number; qtd: number }>();
  for (const l of pagas) {
    const m = mesReferencia(l.pagoEm);
    const cur = recebidoMap.get(m) ?? { recebido: 0, qtd: 0 };
    cur.recebido += l.valor;
    cur.qtd += 1;
    recebidoMap.set(m, cur);
  }
  const receitaPorMes = meses12.map((mes) => ({
    mes,
    label: rotuloMes(mes),
    recebido: cent(recebidoMap.get(mes)?.recebido ?? 0),
    qtd: recebidoMap.get(mes)?.qtd ?? 0,
  }));

  const pagas12 = pagas.filter((l) => meses12.includes(mesReferencia(l.pagoEm)));
  const recebido12m = cent(soma(pagas12.map((l) => l.valor)));
  const ticketMedio = pagas12.length
    ? cent(recebido12m / pagas12.length)
    : 0;
  const recebidoMes = cent(
    soma(
      pagas
        .filter((l) => mesReferencia(l.pagoEm) === mesAtual)
        .map((l) => l.valor),
    ),
  );

  // A receber (cobranças PENDENTE ainda não vencidas), por mês
  const pendentesFuturas = pendentes.filter((l) => l.vencimento >= hoje);
  const aReceberMap = new Map<string, { valor: number; qtd: number }>();
  for (const l of pendentesFuturas) {
    const m = mesReferencia(l.vencimento);
    const cur = aReceberMap.get(m) ?? { valor: 0, qtd: 0 };
    cur.valor += l.valor;
    cur.qtd += 1;
    aReceberMap.set(m, cur);
  }
  const aReceberPorMes = mesesFuturos.map((mes) => ({
    mes,
    label: rotuloMes(mes),
    valor: cent(aReceberMap.get(mes)?.valor ?? 0),
    qtd: aReceberMap.get(mes)?.qtd ?? 0,
  }));
  const aReceberMes =
    aReceberPorMes.find((x) => x.mes === mesAtual)?.valor ?? 0;
  const totalAtrasado = cent(
    soma(
      pendentes.filter((l) => l.vencimento < hoje).map((l) => l.valor),
    ),
  );

  // Split por modalidade — mês atual (realizado)
  const catMap = new Map<CategoriaReceita, number>();
  for (const l of pagas.filter((l) => mesReferencia(l.pagoEm) === mesAtual)) {
    const c = categoriaReceita(l.tipos);
    catMap.set(c, (catMap.get(c) ?? 0) + l.valor);
  }
  const totalCatMes = soma([...catMap.values()]);
  const receitaPorModalidadeMes = CATEGORIAS_RECEITA.map((categoria) => ({
    categoria,
    label: LABEL_CATEGORIA_RECEITA[categoria],
    valor: cent(catMap.get(categoria) ?? 0),
    pct: totalCatMes
      ? Math.round(((catMap.get(categoria) ?? 0) / totalCatMes) * 100)
      : 0,
  })).filter((x) => x.valor > 0);
  // Ajuste de arredondamento: os pct somam exatamente 100.
  const somaPct = soma(receitaPorModalidadeMes.map((x) => x.pct));
  if (receitaPorModalidadeMes.length && somaPct !== 100) {
    const maior = receitaPorModalidadeMes.reduce((a, b) =>
      b.valor > a.valor ? b : a,
    );
    maior.pct += 100 - somaPct;
  }

  // Split por modalidade — 6 meses (barra empilhada)
  const zerado = () =>
    Object.fromEntries(CATEGORIAS_RECEITA.map((c) => [c, 0])) as Record<
      CategoriaReceita,
      number
    >;
  const stackMap = new Map<string, Record<CategoriaReceita, number>>(
    meses6.map((m) => [m, zerado()]),
  );
  for (const l of pagas) {
    const m = mesReferencia(l.pagoEm);
    const bucket = stackMap.get(m);
    if (!bucket) continue;
    bucket[categoriaReceita(l.tipos)] += l.valor;
  }
  const receitaModalidadePorMes: SerieModalidadeMes[] = meses6.map((mes) => {
    const bucket = stackMap.get(mes)!;
    return {
      mes,
      label: rotuloMes(mes),
      ...(Object.fromEntries(
        CATEGORIAS_RECEITA.map((c) => [c, cent(bucket[c])]),
      ) as Record<CategoriaReceita, number>),
    };
  });

  // Rankings (realizado nos últimos 12 meses)
  const planoMap = new Map<string, { valor: number; qtd: number }>();
  for (const l of pagas12) {
    const cur = planoMap.get(l.planoNome) ?? { valor: 0, qtd: 0 };
    cur.valor += l.valor;
    cur.qtd += 1;
    planoMap.set(l.planoNome, cur);
  }
  const topPlanos = [...planoMap.entries()]
    .map(([nome, v]) => ({ nome, valor: cent(v.valor), qtd: v.qtd }))
    .sort((a, b) => b.valor - a.valor)
    .slice(0, 8);

  const pacienteMap = new Map<string, { nome: string; valor: number }>();
  for (const l of pagas12) {
    const cur = pacienteMap.get(l.pacienteId) ?? {
      nome: l.pacienteNome,
      valor: 0,
    };
    cur.valor += l.valor;
    pacienteMap.set(l.pacienteId, cur);
  }
  const topPacientes = [...pacienteMap.entries()]
    .map(([pacienteId, v]) => ({
      pacienteId,
      nome: v.nome,
      valor: cent(v.valor),
    }))
    .sort((a, b) => b.valor - a.valor)
    .slice(0, 8);

  return {
    kpis: { recebidoMes, aReceberMes, totalAtrasado, ticketMedio, recebido12m },
    receitaPorMes,
    receitaPorModalidadeMes,
    receitaModalidadePorMes,
    aReceberPorMes,
    topPlanos,
    topPacientes,
  };
}
