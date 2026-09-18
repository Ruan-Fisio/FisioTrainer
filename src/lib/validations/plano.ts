import { z } from "zod";

export const tipoPlanoValues = ["FISIOTERAPIA", "EDUCACAO_FISICA"] as const;

export const tipoPlanoLabels: Record<(typeof tipoPlanoValues)[number], string> = {
  FISIOTERAPIA: "Fisioterapia",
  EDUCACAO_FISICA: "Educação Física",
};

export const formaPagamentoPlanoValues = ["A_VISTA", "ATE_3X_CARTAO"] as const;

export const formaPagamentoPlanoLabels: Record<
  (typeof formaPagamentoPlanoValues)[number],
  string
> = {
  A_VISTA: "À vista",
  ATE_3X_CARTAO: "Parcelado no cartão",
};

export const periodicidadePlanoValues = ["MENSAL", "TRIMESTRAL"] as const;

export const periodicidadePlanoLabels: Record<
  (typeof periodicidadePlanoValues)[number],
  string
> = {
  MENSAL: "Mensal",
  TRIMESTRAL: "Trimestral",
};

export const valorSchema = z
  .string()
  .trim()
  .min(1, "Valor é obrigatório")
  .transform((v) => v.replace(/\./g, "").replace(",", "."))
  .refine((v) => !Number.isNaN(Number(v)) && Number(v) > 0, {
    message: "Valor inválido",
  })
  .transform((v) => Number(v));

/** Uma sala em que o plano pode ser executado + uma descrição livre do uso dela. */
export const planoSalaSchema = z.object({
  salaId: z.string().min(1),
  descricao: z.string().trim().max(280, "Descrição muito longa").optional(),
});

/**
 * Lista de salas do plano, serializada como JSON num hidden input (mesmo padrão de
 * `gradeLinhas` em `plano-atribuicao-form.tsx`). Um plano de Fisioterapia/Educação Física
 * precisa de pelo menos 1 sala — sem isso o sistema não sabe onde alocar o agendamento
 * (`resolverSalaPlano` bloqueia na hora de agendar); o refine abaixo já falha cedo no form.
 */
const planoSalasSchema = z
  .string()
  .transform((v, ctx) => {
    try {
      return z.array(planoSalaSchema).parse(JSON.parse(v || "[]"));
    } catch {
      ctx.addIssue({ code: "custom", message: "Salas do plano inválidas." });
      return z.NEVER;
    }
  });

export const planoSchema = z
  .object({
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
    creditosRemarcacao: z
      .string()
      .trim()
      .min(1, "Créditos de remarcação é obrigatório")
      .refine((v) => Number.isInteger(Number(v)) && Number(v) >= 0, {
        message: "Créditos de remarcação inválido",
      })
      .transform((v) => Number(v)),
    permiteParcelamentoEstendido: z.preprocess(
      (v) => v === "on" || v === true,
      z.boolean(),
    ),
    valorAVistaMensal: valorSchema,
    valorAVistaTrimestral: valorSchema,
    valorAte3xTrimestral: valorSchema,
    salas: planoSalasSchema,
  })
  .refine((data) => data.salas.length > 0, {
    message: "Selecione ao menos uma sala para o plano.",
    path: ["salas"],
  })
  .refine(
    (data) =>
      !data.permiteParcelamentoEstendido ||
      (data.tipos.includes("FISIOTERAPIA") && data.tipos.includes("EDUCACAO_FISICA")),
    {
      message:
        "Parcelamento estendido só é permitido no plano híbrido (Fisioterapia + Educação Física).",
      path: ["permiteParcelamentoEstendido"],
    },
  );
