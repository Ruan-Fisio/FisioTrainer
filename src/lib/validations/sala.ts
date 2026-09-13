import { z } from "zod";

/**
 * Toda sala tem capacidade para Educação Física e Fisioterapia (as duas modalidades
 * configuráveis). Avaliação e Terapia Manual ficam fixas em `MODALIDADE_SALA_PADRAO`.
 */
export const salaSchema = z.object({
  nome: z.string().trim().min(2, "Informe o nome da sala.").max(80),
  capacidadeEducacaoFisica: z.coerce
    .number()
    .int()
    .min(0, "Capacidade não pode ser negativa.")
    .max(100),
  capacidadeFisioterapia: z.coerce
    .number()
    .int()
    .min(0, "Capacidade não pode ser negativa.")
    .max(100),
});
