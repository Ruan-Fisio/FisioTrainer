import { z } from "zod";
import { DIAS_SEMANA } from "@/lib/dia-semana";

export const treinoDiaExercicioSchema = z.object({
  id: z.string().trim().optional(),
  exercicioId: z.string().trim().min(1, "Selecione um exercício"),
  series: z.coerce.number().int().positive().optional().nullable(),
  repeticoes: z.string().trim().optional(),
  carga: z.coerce.number().positive().optional().nullable(),
  descanso: z.coerce.number().int().positive().optional().nullable(),
  instrucoes: z.string().trim().optional(),
});

export const treinoDiaSchema = z.object({
  id: z.string().trim().optional(),
  diaSemana: z.enum(DIAS_SEMANA),
  exercicios: z
    .array(treinoDiaExercicioSchema)
    .min(1, "Adicione ao menos um exercício"),
});

export const treinoSchema = z.object({
  nome: z.string().trim().min(2, "Nome deve ter ao menos 2 caracteres"),
  descricao: z.string().trim().optional(),
  dias: z.array(treinoDiaSchema).min(1, "Adicione ao menos um dia"),
});

export const atribuirTreinoSchema = z.object({
  treinoIds: z.array(z.string().trim().min(1)).min(1, "Selecione ao menos um treino"),
  pacienteId: z.string().trim().min(1, "Selecione um paciente"),
  dataInicio: z.string().trim().optional(),
  dataFim: z.string().trim().optional(),
});
