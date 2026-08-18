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
