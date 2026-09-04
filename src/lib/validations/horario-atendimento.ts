import { z } from "zod";

export const horarioAtendimentoSchema = z.object({
  modalidade: z.enum(["EDUCACAO_FISICA", "FISIOTERAPIA", "AVALIACAO", "TERAPIA_MANUAL"]),
  horario: z
    .string()
    .trim()
    .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Informe um horário válido (HH:MM)"),
  duracaoMin: z.coerce.number().int().min(5).max(480).default(60),
});
