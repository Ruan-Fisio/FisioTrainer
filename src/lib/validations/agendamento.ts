import { z } from "zod";
import { fromZonedTime } from "date-fns-tz";
import { TIMEZONE } from "@/lib/format";

export const repeticaoOptions = [
  "NAO_REPETE",
  "DIARIA",
  "SEMANAL",
  "MENSAL",
  "ANUAL",
  "PERSONALIZADA",
] as const;

export const unidadeRecorrenciaOptions = ["DIA", "SEMANA", "MES", "ANO"] as const;
export const terminoRecorrenciaOptions = ["NUNCA", "EM_DATA", "APOS_N"] as const;

export const agendamentoSchema = z
  .object({
    titulo: z.string().trim().min(1, "Nome do evento é obrigatório"),
    pacienteIds: z.array(z.string()).default([]),
    profissionalId: z.string().trim().optional(),
    data: z.string().trim().min(1, "Data é obrigatória"),
    horaInicio: z.string().trim().min(1, "Horário de início é obrigatório"),
    horaFim: z.string().trim().min(1, "Horário de término é obrigatório"),
    diaInteiro: z.boolean().default(false),
    modalidade: z.enum(["EDUCACAO_FISICA", "FISIOTERAPIA", "AVALIACAO", "TERAPIA_MANUAL"]),
    status: z.enum(["AGENDADO", "COMPARECEU", "FALTOU", "CANCELADO"]),
    observacao: z.string().trim().optional(),
    repeticao: z.enum(repeticaoOptions).default("NAO_REPETE"),
    intervalo: z.coerce.number().int().min(1).optional(),
    unidade: z.enum(unidadeRecorrenciaOptions).optional(),
    diasSemana: z.array(z.coerce.number().int().min(0).max(6)).default([]),
    termino: z.enum(terminoRecorrenciaOptions).optional(),
    terminoData: z.string().trim().optional(),
    terminoOcorrencias: z.coerce.number().int().min(1).optional(),
  })
  .refine((data) => data.diaInteiro || data.horaFim >= data.horaInicio, {
    message: "Horário de término deve ser igual ou depois do início",
    path: ["horaFim"],
  });

/**
 * Combina uma data (YYYY-MM-DD) e uma hora (HH:mm) informadas pelo usuário,
 * interpretando-as sempre como horário de Brasília — via `date-fns-tz`
 * (`fromZonedTime`), que resolve o offset pelo banco de fusos IANA em vez de um
 * `-03:00` fixo na mão. O resultado não depende do fuso do processo (UTC na
 * Vercel, local em dev).
 */
export function combinarDataHora(data: string, hora: string) {
  return fromZonedTime(`${data}T${hora}:00`, TIMEZONE);
}
