import { z } from "zod";

export const tipoPlanoValues = ["FISIOTERAPIA", "EDUCACAO_FISICA"] as const;

export const tipoPlanoLabels: Record<(typeof tipoPlanoValues)[number], string> = {
  FISIOTERAPIA: "Fisioterapia",
  EDUCACAO_FISICA: "Educação Física",
};

export const formaPagamentoPlanoValues = [
  "A_VISTA",
  "A_VISTA_NF",
  "ATE_3X_CARTAO",
  "ATE_3X_NF",
] as const;

export const formaPagamentoPlanoLabels: Record<
  (typeof formaPagamentoPlanoValues)[number],
  string
> = {
  A_VISTA: "À vista",
  A_VISTA_NF: "À vista + NF",
  ATE_3X_CARTAO: "Até 3x Cartão",
  ATE_3X_NF: "Até 3x + NF",
};

export const periodicidadePlanoValues = ["MENSAL", "TRIMESTRAL"] as const;

export const periodicidadePlanoLabels: Record<
  (typeof periodicidadePlanoValues)[number],
  string
> = {
  MENSAL: "Mensal",
  TRIMESTRAL: "Trimestral",
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

export const planoSchema = z.object({
  nome: z.string().trim().min(1, "Nome do plano é obrigatório"),
  descricao: z.string().trim().optional(),
  tipos: z.array(z.enum(tipoPlanoValues)).min(1, "Selecione ao menos um tipo"),
  atendimentos: z
    .string()
    .trim()
    .min(1, "Número de atendimentos é obrigatório")
    .refine((v) => Number.isInteger(Number(v)) && Number(v) >= 1, {
      message: "Número de atendimentos inválido",
    })
    .transform((v) => Number(v)),
  valorAVistaMensal: valorSchema,
  valorAVistaTrimestral: valorSchema,
  valorAVistaNfMensal: valorSchema,
  valorAVistaNfTrimestral: valorSchema,
  valorAte3xCartaoMensal: valorSchema,
  valorAte3xCartaoTrimestral: valorSchema,
  valorAte3xNfMensal: valorSchema,
  valorAte3xNfTrimestral: valorSchema,
});
