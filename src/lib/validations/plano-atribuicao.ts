import { z } from "zod";

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
    planoOpcaoId: z.string().trim().min(1, "Selecione uma opção do plano"),
    cartao: z.enum(["true", "false"]).transform((v) => v === "true"),
    notaFiscal: z.enum(["true", "false"]).transform((v) => v === "true"),
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
  );
