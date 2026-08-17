import { z } from "zod";

export const pacienteSchema = z.object({
  nome: z.string().trim().min(2, "Nome deve ter ao menos 2 caracteres"),
  idade: z.coerce.number().int().positive().optional(),
  dataNascimento: z.string().trim().optional(),
  cpf: z.string().trim().optional(),
  contato: z.string().trim().optional(),
  endereco: z.string().trim().optional(),
  historicoClinico: z.string().trim().optional(),
  objetivo: z.string().trim().optional(),
  doencasPreexistentes: z.string().trim().optional(),
  cirurgiasAnteriores: z.string().trim().optional(),
  medicamentos: z.string().trim().optional(),
  numeroIndicacao: z.string().trim().optional(),
  pessoaIndicacao: z.string().trim().optional(),
  planoNome: z.string().trim().optional(),
  planoValor: z
    .string()
    .trim()
    .optional()
    .transform((v) =>
      v ? Number(v.replace(/\./g, "").replace(",", ".")) : undefined,
    )
    .refine((v) => v === undefined || (!Number.isNaN(v) && v >= 0), {
      message: "Valor do plano inválido",
    }),
});
