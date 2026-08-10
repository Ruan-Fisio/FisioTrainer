import { z } from "zod";

export const categoriaSchema = z.object({
  name: z.string().min(2, "Nome deve ter ao menos 2 caracteres"),
});
