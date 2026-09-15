import { z } from "zod";

/** Uma sala em que o serviço pode ser executado + capacidade própria (independente das
 * colunas fixas de Fisioterapia/Educação Física em `Sala`). */
export const salaServicoSchema = z.object({
  salaId: z.string().min(1),
  capacidade: z
    .string()
    .trim()
    .min(1, "Capacidade é obrigatória")
    .refine((v) => Number.isInteger(Number(v)) && Number(v) >= 1, {
      message: "Capacidade inválida",
    })
    .transform((v) => Number(v)),
  descricao: z.string().trim().max(280, "Descrição muito longa").optional(),
});

const salasServicoListSchema = z
  .string()
  .transform((v, ctx) => {
    try {
      return z.array(salaServicoSchema).parse(JSON.parse(v || "[]"));
    } catch {
      ctx.addIssue({ code: "custom", message: "Salas do serviço inválidas." });
      return z.NEVER;
    }
  })
  .refine((salas) => new Set(salas.map((s) => s.salaId)).size === salas.length, {
    message: "Uma sala não pode se repetir na lista.",
  });

const profissionaisServicoSchema = z.string().transform((v, ctx) => {
  try {
    return z.array(z.string().min(1)).parse(JSON.parse(v || "[]"));
  } catch {
    ctx.addIssue({ code: "custom", message: "Profissionais do serviço inválidos." });
    return z.NEVER;
  }
});

/**
 * Serviço customizado (Psicologia, Nutrição etc.) fora do fluxo de Plano — sem sala ou
 * profissional é permitido (nesse caso o agendamento manual não checa capacidade/filtro).
 */
export const servicoSchema = z.object({
  nome: z.string().trim().min(2, "Nome deve ter ao menos 2 caracteres"),
  ativo: z.boolean().default(true),
  salas: salasServicoListSchema,
  profissionais: profissionaisServicoSchema,
});
