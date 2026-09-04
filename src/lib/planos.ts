export type FormaPagamentoPlano = "A_VISTA" | "A_VISTA_NF" | "ATE_3X_CARTAO" | "ATE_3X_NF";
export type PeriodicidadePlano = "MENSAL" | "TRIMESTRAL";

/** Nome do campo de valor do Plano para cada combinação forma de pagamento x periodicidade. */
export const campoValorPlano: Record<FormaPagamentoPlano, Record<PeriodicidadePlano, string>> = {
  A_VISTA: { MENSAL: "valorAVistaMensal", TRIMESTRAL: "valorAVistaTrimestral" },
  A_VISTA_NF: { MENSAL: "valorAVistaNfMensal", TRIMESTRAL: "valorAVistaNfTrimestral" },
  ATE_3X_CARTAO: { MENSAL: "valorAte3xCartaoMensal", TRIMESTRAL: "valorAte3xCartaoTrimestral" },
  ATE_3X_NF: { MENSAL: "valorAte3xNfMensal", TRIMESTRAL: "valorAte3xNfTrimestral" },
};

/** Os 8 campos de valor do Plano (4 formas de pagamento x 2 periodicidades). */
export const CAMPOS_VALOR_PLANO = [
  "valorAVistaMensal",
  "valorAVistaTrimestral",
  "valorAVistaNfMensal",
  "valorAVistaNfTrimestral",
  "valorAte3xCartaoMensal",
  "valorAte3xCartaoTrimestral",
  "valorAte3xNfMensal",
  "valorAte3xNfTrimestral",
] as const;

export type CampoValorPlano = (typeof CAMPOS_VALOR_PLANO)[number];

/** Converte os 8 campos de valor (Prisma `Decimal` ou string) para `number`. */
export function planoValoresParaNumero<T extends Record<string, unknown>>(
  plano: T,
): Omit<T, CampoValorPlano> & Record<CampoValorPlano, number> {
  const valores = Object.fromEntries(
    CAMPOS_VALOR_PLANO.map((campo) => [campo, Number(plano[campo] ?? 0)]),
  ) as Record<CampoValorPlano, number>;
  return { ...plano, ...valores };
}

/** Lê, no Plano, o valor correspondente à forma de pagamento e periodicidade escolhidas. */
export function valorPlano(
  plano: Record<string, unknown>,
  formaPagamento: FormaPagamentoPlano,
  periodicidade: PeriodicidadePlano,
): number {
  const raw = plano[campoValorPlano[formaPagamento][periodicidade]];
  return raw == null ? 0 : Number(raw);
}

/** Só "Até 3x Cartão" é pagamento no cartão — as outras 3 formas não são. */
export function cartaoDaForma(formaPagamento: FormaPagamentoPlano): boolean {
  return formaPagamento === "ATE_3X_CARTAO";
}

/** Formas "+ NF" já incluem nota fiscal no valor cadastrado no plano. */
export function notaFiscalDaForma(formaPagamento: FormaPagamentoPlano): boolean {
  return formaPagamento === "A_VISTA_NF" || formaPagamento === "ATE_3X_NF";
}

/** "À vista" permite só 1 parcela; "Até 3x" permite até 3. */
export function maxParcelasDaForma(formaPagamento: FormaPagamentoPlano): number {
  return formaPagamento === "ATE_3X_CARTAO" || formaPagamento === "ATE_3X_NF" ? 3 : 1;
}

/** Divide o valor total em N parcelas, ajustando centavos de arredondamento na última parcela. */
export function gerarValoresParcelas(
  valorTotal: number,
  numeroParcelas: number,
): number[] {
  const centavosTotal = Math.round(valorTotal * 100);
  const centavosParcela = Math.floor(centavosTotal / numeroParcelas);
  const valores = Array.from({ length: numeroParcelas }, () => centavosParcela / 100);
  const restoCentavos = centavosTotal - centavosParcela * numeroParcelas;
  valores[numeroParcelas - 1] += restoCentavos / 100;
  return valores;
}

/**
 * Percentual padrão aplicado quando a nota fiscal está inclusa na cobrança.
 * Fixo em toda a aplicação — só mudar se o usuário pedir explicitamente.
 */
export const TAXA_NOTA_FISCAL = 7;

/** Aplica a taxa fixa de nota fiscal sobre o valor, se a NF estiver inclusa. */
export function aplicarTaxaNotaFiscal(valor: number, notaFiscal: boolean): number {
  if (!notaFiscal) return valor;
  return Math.round(valor * (1 + TAXA_NOTA_FISCAL / 100) * 100) / 100;
}

export type DescontoTipo = "NENHUM" | "VALOR" | "PERCENTUAL" | "ALVO_PARCELA";

/**
 * Calcula o desconto e o valor final a partir do valor original e do modo escolhido.
 * No modo ALVO_PARCELA o desconto é a diferença entre o valor original e
 * (valorAlvoParcela * numeroParcelas); nunca fica negativo nem maior que o valor original.
 */
export function calcularDesconto(
  valorOriginal: number,
  tipo: DescontoTipo,
  descontoValor: number,
  valorAlvoParcela: number,
  numeroParcelas: number,
): { valor: number; desconto: number } {
  let desconto = 0;

  if (tipo === "VALOR") {
    desconto = descontoValor;
  } else if (tipo === "PERCENTUAL") {
    desconto = valorOriginal * (descontoValor / 100);
  } else if (tipo === "ALVO_PARCELA" && numeroParcelas > 0) {
    desconto = valorOriginal - valorAlvoParcela * numeroParcelas;
  }

  desconto = Math.round(Math.min(Math.max(desconto, 0), valorOriginal) * 100) / 100;
  const valor = Math.round((valorOriginal - desconto) * 100) / 100;

  return { valor, desconto };
}

/**
 * Gera as datas de vencimento das parcelas a partir da 1ª data (formato "AAAA-MM-DD"):
 * a 1ª parcela fica na data informada e as seguintes caem no mesmo dia dos meses seguintes,
 * ajustando para o último dia do mês quando ele não existir (ex.: dia 31 em mês de 30 dias).
 */
export function gerarDatasVencimento(
  primeiraData: string,
  numeroParcelas: number,
): string[] {
  const [ano, mes, dia] = primeiraData.split("-").map(Number);

  return Array.from({ length: numeroParcelas }, (_, i) => {
    const mesAlvo = mes - 1 + i;
    const anoAlvo = ano + Math.floor(mesAlvo / 12);
    const mesAlvoNormalizado = ((mesAlvo % 12) + 12) % 12;
    const ultimoDiaDoMes = new Date(anoAlvo, mesAlvoNormalizado + 1, 0).getDate();
    const diaFinal = Math.min(dia, ultimoDiaDoMes);

    const y = String(anoAlvo).padStart(4, "0");
    const m = String(mesAlvoNormalizado + 1).padStart(2, "0");
    const d = String(diaFinal).padStart(2, "0");
    return `${y}-${m}-${d}`;
  });
}
