import { z } from "zod";

export const pacienteSchema = z.object({
  nome: z.string().trim().min(2, "Nome deve ter ao menos 2 caracteres"),
  idade: z.coerce.number().int().positive().optional(),
  cpf: z.string().trim().optional(),
  contato: z.string().trim().optional(),
  historicoClinico: z.string().trim().optional(),
  objetivo: z.string().trim().optional(),
  doencasPreexistentes: z.string().trim().optional(),
  cirurgiasAnteriores: z.string().trim().optional(),
  medicamentos: z.string().trim().optional(),
});
