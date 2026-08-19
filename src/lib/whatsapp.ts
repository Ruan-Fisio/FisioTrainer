import { formatarData, formatarMoeda } from "@/lib/format";

const PIX_CHAVE = "28998858428";
const PIX_NOME = "Ruan Ramiro Da Silva";

/** Normaliza um telefone brasileiro em qualquer formato para dígitos com DDI 55, para uso no wa.me. */
export function normalizarTelefoneBr(telefone: string | null | undefined): string | null {
  if (!telefone) return null;
  const digitos = telefone.replace(/\D/g, "");
  if (!digitos) return null;
  return digitos.startsWith("55") ? digitos : `55${digitos}`;
}

export function montarMensagemCobranca({
  pacienteNome,
  planoNome,
  valor,
  vencimento,
  numeroParcela,
  totalParcelas,
  cnpjPix,
}: {
  pacienteNome: string;
  planoNome: string;
  valor: number;
  vencimento: Date;
  numeroParcela?: number | null;
  totalParcelas?: number | null;
  cnpjPix?: string | null;
}) {
  const parcelaTexto =
    numeroParcela && totalParcelas ? ` (parcela ${numeroParcela}/${totalParcelas})` : "";

  const opcaoCnpj = cnpjPix
    ? `\n\nOu, se preferir, pode usar o CNPJ como chave Pix:\nChave Pix (CNPJ): ${cnpjPix}\nNome: ${PIX_NOME}`
    : "";

  return `Olá, ${pacienteNome}! Tudo bem?

Passando para lembrar da cobrança referente ao *${planoNome}*${parcelaTexto}, no valor de *${formatarMoeda(valor)}*, com vencimento em *${formatarData(vencimento)}*.

Para o pagamento, pode usar o Pix abaixo:
Chave Pix: ${PIX_CHAVE}
Nome: ${PIX_NOME}${opcaoCnpj}

Qualquer dúvida, estou à disposição. Obrigado!`;
}

/** Monta o link do wa.me com a mensagem pronta, ou null se não houver telefone válido. */
export function montarLinkWhatsapp(telefone: string | null | undefined, mensagem: string) {
  const numero = normalizarTelefoneBr(telefone);
  if (!numero) return null;
  return `https://wa.me/${numero}?text=${encodeURIComponent(mensagem)}`;
}
