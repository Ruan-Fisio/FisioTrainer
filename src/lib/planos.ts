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

/** Aplica a taxa percentual do cartão sobre o valor, se o pagamento for no cartão. */
export function aplicarTaxaCartao(
  valor: number,
  taxaCartao: number,
  cartao: boolean,
): number {
  if (!cartao || taxaCartao <= 0) return valor;
  return Math.round(valor * (1 + taxaCartao / 100) * 100) / 100;
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
