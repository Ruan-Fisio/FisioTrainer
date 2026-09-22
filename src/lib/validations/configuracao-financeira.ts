import { z } from "zod";

export const configuracaoTaxaSchema = z.object({
  percentual: z
    .string()
    .trim()
    .min(1, "Taxa é obrigatória")
    .transform((v) => v.replace(/\./g, "").replace(",", "."))
    .refine((v) => !Number.isNaN(Number(v)) && Number(v) >= 0 && Number(v) <= 100, {
      message: "Taxa inválida (0 a 100)",
    })
    .transform((v) => Number(v)),
});
