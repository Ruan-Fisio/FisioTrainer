import { z } from "zod";

export const evolucaoSchema = z.object({
  hdp: z.string().trim().min(1, "HDP é obrigatório"),
  hda: z.string().trim().min(1, "HDA é obrigatório"),
  pa: z.string().trim().min(1, "PA é obrigatória"),
  fc: z.string().trim().min(1, "FC é obrigatória"),
  spo2: z.string().trim().min(1, "SpO2 é obrigatório"),
  fr: z.string().trim().min(1, "FR é obrigatória"),
  temperatura: z.string().trim().min(1, "Temperatura é obrigatória"),
  evolucao: z.string().trim().min(1, "Evolução é obrigatória"),
  conduta: z.string().trim().min(1, "Conduta é obrigatória"),
});
