import { z } from "zod";

export const agendamentoSchema = z.object({
  pacienteId: z.string().trim().min(1, "Paciente é obrigatório"),
  data: z.string().trim().min(1, "Data é obrigatória"),
  hora: z.string().trim().min(1, "Horário é obrigatório"),
  tipo: z.enum(["AVALIACAO", "RETORNO", "SESSAO"]),
  status: z.enum(["AGENDADO", "COMPARECEU", "FALTOU", "CANCELADO"]),
  observacao: z.string().trim().optional(),
});

export function combinarDataHora(data: string, hora: string) {
  return new Date(`${data}T${hora}:00`);
}
