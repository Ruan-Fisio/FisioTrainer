import { z } from "zod";

export const tipoPlanoValues = ["FISIOTERAPIA", "EDUCACAO_FISICA"] as const;

export const tipoPlanoLabels: Record<(typeof tipoPlanoValues)[number], string> = {
  FISIOTERAPIA: "Fisioterapia",
  EDUCACAO_FISICA: "Educação Física",
};

const valorSchema = z
  .string()
  .trim()
  .min(1, "Valor é obrigatório")
  .transform((v) => v.replace(/\./g, "").replace(",", "."))
  .refine((v) => !Number.isNaN(Number(v)) && Number(v) > 0, {
    message: "Valor inválido",
  })
  .transform((v) => Number(v));

export const planoOpcaoSchema = z.object({
  atendimentos: z
    .string()
    .trim()
    .min(1, "Número de atendimentos é obrigatório")
    .refine((v) => Number.isInteger(Number(v)) && Number(v) >= 1, {
      message: "Número de atendimentos inválido",
    })
    .transform((v) => Number(v)),
  valor: valorSchema,
});

export const planoSchema = z.object({
  nome: z.string().trim().min(1, "Nome do plano é obrigatório"),
  descricao: z.string().trim().optional(),
  tipos: z.array(z.enum(tipoPlanoValues)).min(1, "Selecione ao menos um tipo"),
  opcoes: z.array(planoOpcaoSchema).min(1, "Adicione ao menos uma opção"),
  taxaCartao: z
    .string()
    .trim()
    .transform((v) => (v.trim() === "" ? "0" : v))
    .transform((v) => v.replace(",", "."))
    .refine((v) => !Number.isNaN(Number(v)) && Number(v) >= 0 && Number(v) <= 100, {
      message: "Taxa do cartão deve estar entre 0 e 100",
    })
    .transform((v) => Number(v)),
});
