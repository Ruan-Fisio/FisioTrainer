import { z } from "zod";

export const grupoPacienteSchema = z.object({
  nome: z.string().trim().min(1, "Nome é obrigatório"),
  pacienteIds: z.array(z.string()).min(1, "Selecione ao menos um paciente"),
});
