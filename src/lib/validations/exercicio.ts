import { z } from "zod";

export const exercicioSchema = z.object({
  name: z.string().min(2, "Nome deve ter ao menos 2 caracteres"),
  categoriaIds: z
    .array(z.string())
    .min(1, "Selecione ao menos uma categoria"),
  links: z
    .array(z.object({ url: z.string().url("URL inválida") }))
    .min(1, "Adicione ao menos um link"),
});
