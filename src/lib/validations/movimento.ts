import { z } from "zod";

export const movimentoSchema = z.object({
  nome: z.string().trim().min(2, "Nome deve ter ao menos 2 caracteres"),
  grauIdeal: z.string().trim().min(1, "Grau ideal é obrigatório"),
});
