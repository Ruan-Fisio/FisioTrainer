export type FormaPagamentoPlano = "A_VISTA" | "ATE_3X_CARTAO";
export type PeriodicidadePlano = "MENSAL" | "TRIMESTRAL";

/**
 * Os 2 preços do Plano (nota fiscal sempre inclusa no valor cadastrado), sempre à vista:
 * o parcelamento no cartão aplica a taxa configurável de `ConfiguracaoTaxa` em cima
 * desses valores (ver `calcularValorParcelado`), não tem preço fixo próprio.
 */
export const CAMPOS_VALOR_PLANO = [
  "valorAVistaMensal",
  "valorAVistaTrimestral",
] as const;

export type CampoValorPlano = (typeof CAMPOS_VALOR_PLANO)[number];

/** Converte os campos de valor (Prisma `Decimal` ou string) para `number`. */
export function planoValoresParaNumero<T extends Record<string, unknown>>(
  plano: T,
): Omit<T, CampoValorPlano> & Record<CampoValorPlano, number> {
  const valores = Object.fromEntries(
    CAMPOS_VALOR_PLANO.map((campo) => [campo, Number(plano[campo] ?? 0)]),
  ) as Record<CampoValorPlano, number>;
  return { ...plano, ...valores };
}

/** Lê, no Plano, o valor à vista correspondente à periodicidade escolhida. */
export function valorPlano(
  plano: Record<string, unknown>,
  periodicidade: PeriodicidadePlano,
): number {
  const campo = periodicidade === "MENSAL" ? "valorAVistaMensal" : "valorAVistaTrimestral";
  const raw = plano[campo];
  return raw == null ? 0 : Number(raw);
}

/** Um plano é "híbrido" quando atende as duas modalidades fixas ao mesmo tempo (Fisioterapia + Educação Física). */
export function planoHibrido(tipos: string[]): boolean {
  return tipos.includes("FISIOTERAPIA") && tipos.includes("EDUCACAO_FISICA");
}

/** Só "Até 3x no cartão" é pagamento no cartão. */
export function cartaoDaForma(formaPagamento: FormaPagamentoPlano): boolean {
  return formaPagamento === "ATE_3X_CARTAO";
}

/**
 * Máximo de parcelas: plano mensal nunca parcela (1); trimestral à vista = 1,
 * trimestral em até 3x no cartão = 3. Planos com `permiteParcelamentoEstendido`
 * (checkbox no cadastro do Plano) têm o teto ampliado: mensal até 2x, trimestral até 6x.
 */
export function maxParcelasPlano(
  periodicidade: PeriodicidadePlano,
  formaPagamento: FormaPagamentoPlano,
  permiteParcelamentoEstendido = false,
): number {
  if (formaPagamento !== "ATE_3X_CARTAO") return 1;
  if (periodicidade === "MENSAL") return permiteParcelamentoEstendido ? 2 : 1;
  return permiteParcelamentoEstendido ? 6 : 3;
}

/**
 * Forma de pagamento efetiva: plano mensal é sempre à vista, exceto quando o plano
 * permite parcelamento estendido (aí pode ir pro cartão, até 2x).
 */
export function formaEfetiva(
  periodicidade: PeriodicidadePlano,
  formaPagamento: FormaPagamentoPlano,
  permiteParcelamentoEstendido = false,
): FormaPagamentoPlano {
  if (periodicidade === "MENSAL") {
    return permiteParcelamentoEstendido ? formaPagamento : "A_VISTA";
  }
  return formaPagamento;
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

/**
 * Valor retido pela clínica sobre uma cobrança de serviço avulso, a partir do
 * percentual configurado no cadastro do `Servico` (`taxaProfissionalPercentual`).
 * Só informativo pro dashboard — arredonda em centavos como o resto do arquivo.
 */
export function calcularTaxaProfissional(
  valorParcela: number,
  percentual: number,
): number {
  return Math.round(valorParcela * (percentual / 100) * 100) / 100;
}

/**
 * Aplica a taxa de parcelamento no cartão (configurável em Configurações > Financeiro,
 * `ConfiguracaoTaxa` de chave `PARCELAMENTO_CARTAO`) sobre o valor à vista de um Plano.
 * Cumulativa por parcela: 2x = +1×taxa, 3x = +2×taxa, ... À vista (1 parcela ou menos)
 * não tem taxa.
 */
export function calcularValorParcelado(
  valorAVista: number,
  percentualTaxa: number,
  numeroParcelas: number,
): number {
  if (numeroParcelas <= 1) return valorAVista;
  const fator = 1 + (percentualTaxa / 100) * numeroParcelas;
  return Math.round(valorAVista * fator * 100) / 100;
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
