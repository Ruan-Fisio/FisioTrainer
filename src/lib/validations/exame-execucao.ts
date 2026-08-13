import { z } from "zod";

export const exameExecucaoValorSchema = z.object({
  colunaId: z.string().min(1),
  valor: z.string().trim(),
  linha: z.number().int().min(0).optional().default(0),
});

export const exameExecucaoSchema = z.object({
  exameId: z.string().min(1, "Selecione um exame"),
  valores: z.array(exameExecucaoValorSchema),
});
