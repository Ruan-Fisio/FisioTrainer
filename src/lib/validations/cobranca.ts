import { z } from "zod";

export const cobrancaSchema = z.object({
  planoNome: z.string().trim().min(1, "Nome do plano é obrigatório"),
  valor: z
    .string()
    .trim()
    .min(1, "Valor é obrigatório")
    .transform((v) => v.replace(/\./g, "").replace(",", "."))
    .refine((v) => !Number.isNaN(Number(v)) && Number(v) >= 0, {
      message: "Valor inválido",
    })
    .transform((v) => Number(v)),
  vencimento: z
    .string()
    .trim()
    .min(1, "Data de vencimento é obrigatória")
    .transform((v) => new Date(`${v}T12:00:00`)),
  status: z.enum(["PENDENTE", "PAGO"]),
  observacao: z.string().trim().optional(),
});
