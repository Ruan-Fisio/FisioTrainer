/**
 * Regras das despesas da clínica (lógica pura, sem Prisma): categorias, status, filtro por
 * mês, resumo da aba Despesas e comparativo receita x despesas da aba Financeiro.
 *
 * Duas datas, dois significados:
 * - `data` (compra/vencimento) define o "mês da despesa" — base da aba Despesas;
 * - `pagoEm` define quando o dinheiro saiu — base do comparativo, igual à receita, que
 *   conta pelo `pagoEm` da cobrança (regime de caixa).
 */
import { formatInTimeZone } from "date-fns-tz";
import { ptBR } from "date-fns/locale";
import { inicioDoDia, dataBrasilia, fimDoMes } from "./datas-brasilia";
import { mesReferencia, rotuloMes, sequenciaMeses } from "./financeiro";
import { TIMEZONE } from "./format";
import { parseListParam } from "./search-params";

export const CATEGORIAS_DESPESA = [
  "ALUGUEL",
  "ENERGIA",
  "AGUA",
  "INTERNET_TELEFONE",
  "EQUIPAMENTO",
  "MATERIAL",
  "MANUTENCAO",
  "IMPOSTOS",
  "SALARIOS",
  "SERVICOS_TERCEIROS",
  "MARKETING",
  "OUTROS",
] as const;

export type CategoriaDespesa = (typeof CATEGORIAS_DESPESA)[number];
export type StatusDespesa = "PENDENTE" | "PAGO";

export const LABEL_CATEGORIA_DESPESA: Record<CategoriaDespesa, string> = {
  ALUGUEL: "Aluguel",
  ENERGIA: "Energia elétrica",
  AGUA: "Água",
  INTERNET_TELEFONE: "Internet e telefone",
  EQUIPAMENTO: "Equipamentos",
  MATERIAL: "Materiais e insumos",
  MANUTENCAO: "Manutenção",
  IMPOSTOS: "Impostos e taxas",
  SALARIOS: "Salários e pró-labore",
  SERVICOS_TERCEIROS: "Serviços de terceiros",
  MARKETING: "Marketing",
  OUTROS: "Outros",
};

export type DespesaLinha = {
  categoria: CategoriaDespesa;
  valor: number;
  data: Date;
  status: StatusDespesa;
  pagoEm: Date | null;
};

const cent = (n: number) => Math.round(n * 100) / 100;
const soma = (ns: number[]) => ns.reduce((a, b) => a + b, 0);

/** Pendente com data anterior a hoje (Brasília) está em atraso; a data de hoje ainda não. */
export function despesaAtrasada(
  d: Pick<DespesaLinha, "status" | "data">,
  agora: Date = new Date(),
): boolean {
  return d.status === "PENDENTE" && d.data < inicioDoDia(agora);
}

/** Valida o `?mes=YYYY-MM` da URL; valor ausente ou inválido cai no mês atual. */
export function normalizarMes(valor: string | null | undefined, agora: Date = new Date()): string {
  if (valor && /^\d{4}-(0[1-9]|1[0-2])$/.test(valor) && valor >= "2000-01" && valor <= "2100-12") {
    return valor;
  }
  return mesReferencia(agora);
}

/** Soma `delta` meses a uma ref "YYYY-MM", cruzando a virada de ano. */
export function deslocarMes(mes: string, delta: number): string {
  const [ano, m] = mes.split("-").map(Number);
  const total = ano * 12 + (m - 1) + delta;
  const novoAno = Math.floor(total / 12);
  const novoMes = total - novoAno * 12 + 1;
  return `${String(novoAno).padStart(4, "0")}-${String(novoMes).padStart(2, "0")}`;
}

/** Bordas do mês no fuso da clínica: `inicio` inclusivo, `fim` exclusivo. */
export function intervaloDoMes(mes: string): { inicio: Date; fim: Date } {
  const [ano, m] = mes.split("-").map(Number);
  const [proxAno, proxMes] = deslocarMes(mes, 1).split("-").map(Number);
  return { inicio: dataBrasilia(ano, m), fim: dataBrasilia(proxAno, proxMes) };
}

/** Rótulo por extenso de uma ref "YYYY-MM" ("novembro de 2026"). */
export function rotuloMesExtenso(mes: string): string {
  return formatInTimeZone(intervaloDoMes(mes).inicio, TIMEZONE, "MMMM 'de' yyyy", { locale: ptBR });
}

export type FiltrosDespesas = {
  mes: string;
  categorias: CategoriaDespesa[];
  status: StatusDespesa[];
  q: string;
};

/**
 * Filtros da aba Despesas a partir da URL. Valores desconhecidos são descartados, porque um
 * enum inválido vindo de um link editado à mão faria o Prisma lançar erro na listagem.
 */
export function parseFiltrosDespesas(
  params: { mes?: string; categorias?: string; status?: string; q?: string },
  agora: Date = new Date(),
): FiltrosDespesas {
  return {
    mes: normalizarMes(params.mes, agora),
    categorias: parseListParam(params.categorias).filter((c): c is CategoriaDespesa =>
      (CATEGORIAS_DESPESA as readonly string[]).includes(c),
    ),
    status: parseListParam(params.status).filter(
      (s): s is StatusDespesa => s === "PENDENTE" || s === "PAGO",
    ),
    q: params.q?.trim() ?? "",
  };
}

export type ResumoDespesasMes = {
  total: number;
  pago: number;
  aPagar: number;
  qtd: number;
  /** Pendências vencidas de qualquer mês, não só do selecionado. */
  atrasado: number;
  qtdAtrasadas: number;
  porCategoria: {
    categoria: CategoriaDespesa;
    label: string;
    valor: number;
    qtd: number;
    pct: number;
  }[];
};

/** Resumo do mês da aba Despesas. `linhas` precisa incluir as pendências de outros meses. */
export function resumirDespesasMes(
  linhas: DespesaLinha[],
  mes: string,
  agora: Date = new Date(),
): ResumoDespesasMes {
  const doMes = linhas.filter((l) => mesReferencia(l.data) === mes);
  const total = soma(doMes.map((l) => l.valor));
  const atrasadas = linhas.filter((l) => despesaAtrasada(l, agora));

  const porCategoria = CATEGORIAS_DESPESA.map((categoria) => {
    const itens = doMes.filter((l) => l.categoria === categoria);
    const valor = soma(itens.map((l) => l.valor));
    return {
      categoria,
      label: LABEL_CATEGORIA_DESPESA[categoria],
      valor: cent(valor),
      qtd: itens.length,
      pct: total ? Math.round((valor / total) * 100) : 0,
    };
  })
    .filter((c) => c.qtd > 0)
    .sort((a, b) => b.valor - a.valor);

  return {
    total: cent(total),
    pago: cent(soma(doMes.filter((l) => l.status === "PAGO").map((l) => l.valor))),
    aPagar: cent(soma(doMes.filter((l) => l.status === "PENDENTE").map((l) => l.valor))),
    qtd: doMes.length,
    atrasado: cent(soma(atrasadas.map((l) => l.valor))),
    qtdAtrasadas: atrasadas.length,
    porCategoria,
  };
}

export type ComparativoReceitaDespesa = {
  mes: {
    recebido: number;
    despesasPagas: number;
    /** recebido − despesas pagas: o que de fato sobrou (ou faltou) até agora no mês. */
    saldo: number;
    aReceber: number;
    /** Pendências com data até o fim do mês, inclusive as atrasadas de meses anteriores. */
    aPagar: number;
    /** saldo + a receber − a pagar. */
    saldoPrevisto: number;
    /** % da receita do mês consumida pelas despesas pagas; null sem receita no mês. */
    comprometimentoPct: number | null;
  };
  porMes: { mes: string; label: string; receita: number; despesa: number; saldo: number }[];
};

/**
 * Receita x despesas em regime de caixa. Recebe a receita já agregada por
 * `analisarFinanceiro`, para os dois lados da conta nunca divergirem da aba Financeiro.
 */
export function compararReceitaDespesa(
  receitaPorMes: { mes: string; recebido: number }[],
  aReceberMes: number,
  despesas: DespesaLinha[],
  agora: Date = new Date(),
): ComparativoReceitaDespesa {
  const mesAtual = mesReferencia(agora);
  const fim = fimDoMes(agora);

  const pagoPorMes = new Map<string, number>();
  for (const d of despesas) {
    if (d.status !== "PAGO" || !d.pagoEm) continue;
    const m = mesReferencia(d.pagoEm);
    pagoPorMes.set(m, (pagoPorMes.get(m) ?? 0) + d.valor);
  }
  const receitaMap = new Map(receitaPorMes.map((r) => [r.mes, r.recebido]));

  const porMes = sequenciaMeses(agora, 12, "passado").map((mes) => {
    const receita = receitaMap.get(mes) ?? 0;
    const despesa = cent(pagoPorMes.get(mes) ?? 0);
    return { mes, label: rotuloMes(mes), receita, despesa, saldo: cent(receita - despesa) };
  });

  const recebido = receitaMap.get(mesAtual) ?? 0;
  const despesasPagas = cent(pagoPorMes.get(mesAtual) ?? 0);
  const aPagar = cent(
    soma(despesas.filter((d) => d.status === "PENDENTE" && d.data <= fim).map((d) => d.valor)),
  );
  const saldo = cent(recebido - despesasPagas);

  return {
    mes: {
      recebido,
      despesasPagas,
      saldo,
      aReceber: aReceberMes,
      aPagar,
      saldoPrevisto: cent(saldo + aReceberMes - aPagar),
      comprometimentoPct: recebido > 0 ? Math.round((despesasPagas / recebido) * 100) : null,
    },
    porMes,
  };
}
