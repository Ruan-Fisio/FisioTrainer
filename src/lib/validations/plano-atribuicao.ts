import { z } from "zod";

const dataSchema = z
  .string()
  .trim()
  .min(1, "Data é obrigatória")
  .transform((v) => new Date(`${v}T12:00:00`));

export const planoAtribuicaoSchema = z.object({
  planoOpcaoId: z.string().trim().min(1, "Selecione uma opção do plano"),
  cartao: z.enum(["true", "false"]).transform((v) => v === "true"),
  vencimentos: z
    .array(dataSchema)
    .min(1, "Adicione ao menos uma parcela com data de vencimento"),
});
