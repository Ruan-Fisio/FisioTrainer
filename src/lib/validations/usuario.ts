import { z } from "zod";

export const usuarioSchema = z.object({
  name: z.string().trim().min(2, "Nome deve ter ao menos 2 caracteres"),
  email: z.string().trim().email("E-mail inválido"),
  password: z.string().min(4, "Senha deve ter ao menos 4 caracteres"),
  cref: z.string().trim().optional().or(z.literal("")),
  crefito: z.string().trim().optional().or(z.literal("")),
});

export const usuarioUpdateSchema = z.object({
  name: z.string().trim().min(2, "Nome deve ter ao menos 2 caracteres"),
  email: z.string().trim().email("E-mail inválido"),
  password: z
    .string()
    .min(4, "Senha deve ter ao menos 4 caracteres")
    .optional()
    .or(z.literal("")),
  cref: z.string().trim().optional().or(z.literal("")),
  crefito: z.string().trim().optional().or(z.literal("")),
});

export const loginSchema = z.object({
  email: z.string().trim().email("E-mail inválido"),
  password: z.string().min(1, "Informe a senha"),
});
