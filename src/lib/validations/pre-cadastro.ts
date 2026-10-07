import { z } from "zod";
import { celularValido, soDigitos } from "@/lib/telefone";
import { contarPalavras } from "@/lib/texto";

export const LIMITE_PALAVRAS_QUEIXA = 2000;

export const preCadastroSchema = z.object({
  nome: z.string().trim().min(2, "Informe o nome."),
  sobrenome: z.string().trim().min(2, "Informe o sobrenome."),
  celular: z
    .string()
    .trim()
    .refine(celularValido, "Informe um celular válido com DDD.")
    .transform(soDigitos),
  queixaPrincipal: z
    .string()
    .trim()
    .min(10, "Descreva sua queixa principal.")
    .refine(
      (v) => contarPalavras(v) <= LIMITE_PALAVRAS_QUEIXA,
      `A queixa deve ter no máximo ${LIMITE_PALAVRAS_QUEIXA} palavras.`,
    ),
});

export const rejeitarPreCadastroSchema = z.object({
  motivo: z.string().trim().max(500, "Motivo muito longo (máx. 500).").optional(),
});
