import { z } from "zod";

export const feriadoSchema = z.object({
  data: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Informe uma data válida."),
  descricao: z.string().trim().min(2, "Descreva o feriado.").max(120),
});
