import { z } from "zod";
import { formaPagamentoPlanoValues, periodicidadePlanoValues } from "./plano";
import { maxParcelasPlano } from "../planos";

const dataSchema = z
  .string()
  .trim()
  .min(1, "Data é obrigatória")
  .transform((v) => new Date(`${v}T12:00:00`));

/** Entrada do diálogo "Renovar plano" (`renovarPlanoAtribuicao`). */
export const renovarPlanoSchema = z.object({
  primeiraData: z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Informe a data de vencimento da 1ª parcela"),
  numeroParcelas: z.coerce.number().int().min(1, "Ao menos 1 parcela"),
});

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
    const max = maxParcelasPlano(data.periodicidade, data.formaPagamento);
    if (data.vencimentos.length > max) {
      ctx.addIssue({
        code: "custom",
        message:
          data.periodicidade === "MENSAL"
            ? "Plano mensal não pode ser parcelado (parcela única)"
            : `Trimestral ${data.formaPagamento === "ATE_3X_CARTAO" ? "em até 3x no cartão" : "à vista"} permite no máximo ${max} parcela(s)`,
        path: ["vencimentos"],
      });
    }
  });
