import { z } from "zod";
import { formaPagamentoPlanoValues, periodicidadePlanoValues } from "./plano";
import { maxParcelasDaForma } from "../planos";

const dataSchema = z
  .string()
  .trim()
  .min(1, "Data é obrigatória")
  .transform((v) => new Date(`${v}T12:00:00`));

function numeroOpcionalSchema() {
  return z
    .string()
    .optional()
    .transform((v) => (v ? Number(v.replace(",", ".")) : 0));
}

export const planoAtribuicaoSchema = z
  .object({
    planoId: z.string().trim().min(1, "Selecione um plano"),
    formaPagamento: z.enum(formaPagamentoPlanoValues, {
      error: "Selecione a forma de pagamento",
    }),
    periodicidade: z.enum(periodicidadePlanoValues).default("MENSAL"),
    vencimentos: z
      .array(dataSchema)
      .min(1, "Adicione ao menos uma parcela com data de vencimento"),
    descontoTipo: z
      .enum(["NENHUM", "VALOR", "PERCENTUAL", "ALVO_PARCELA"])
      .default("NENHUM"),
    descontoValor: numeroOpcionalSchema(),
    valorAlvoParcela: numeroOpcionalSchema(),
  })
  .refine((data) => data.descontoTipo !== "VALOR" || data.descontoValor > 0, {
    message: "Informe o valor do desconto",
    path: ["descontoValor"],
  })
  .refine(
    (data) =>
      data.descontoTipo !== "PERCENTUAL" ||
      (data.descontoValor > 0 && data.descontoValor <= 100),
    {
      message: "Informe um percentual de desconto válido (0-100)",
      path: ["descontoValor"],
    },
  )
  .refine(
    (data) => data.descontoTipo !== "ALVO_PARCELA" || data.valorAlvoParcela > 0,
    {
      message: "Informe o valor alvo por parcela",
      path: ["valorAlvoParcela"],
    },
  )
  .superRefine((data, ctx) => {
    const max = maxParcelasDaForma(data.formaPagamento);
    if (data.vencimentos.length > max) {
      ctx.addIssue({
        code: "custom",
        message: `${formaPagamentoLabelParaErro(data.formaPagamento)} permite no máximo ${max} parcela(s)`,
        path: ["vencimentos"],
      });
    }
  });

function formaPagamentoLabelParaErro(formaPagamento: string) {
  return formaPagamento.startsWith("ATE_3X") ? "Até 3x" : "À vista";
}
