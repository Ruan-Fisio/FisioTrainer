import { z } from "zod";
import { formaPagamentoPlanoValues, periodicidadePlanoValues } from "./plano";

/**
 * Maior número de parcelas possível em todo o sistema (trimestral com parcelamento
 * estendido). O schema só garante essa faixa genérica; o teto exato por plano
 * (`maxParcelasPlano`, que depende de `Plano.permiteParcelamentoEstendido`) é checado
 * na server action, depois que o `Plano` é buscado no banco.
 */
export const MAX_PARCELAS_PLANO_HARD_CAP = 6;

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
    if (data.vencimentos.length > MAX_PARCELAS_PLANO_HARD_CAP) {
      ctx.addIssue({
        code: "custom",
        message: `No máximo ${MAX_PARCELAS_PLANO_HARD_CAP} parcelas.`,
        path: ["vencimentos"],
      });
    }
  });
