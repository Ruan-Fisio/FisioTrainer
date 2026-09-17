import { z } from "zod";
import { valorSchema, formaPagamentoPlanoValues } from "./plano";
import { maxParcelasPlano } from "../planos";

/** Uma sala em que o serviço pode ser executado + capacidade própria (independente das
 * colunas fixas de Fisioterapia/Educação Física em `Sala`). */
export const salaServicoSchema = z.object({
  salaId: z.string().min(1),
  capacidade: z
    .string()
    .trim()
    .min(1, "Capacidade é obrigatória")
    .refine((v) => Number.isInteger(Number(v)) && Number(v) >= 1, {
      message: "Capacidade inválida",
    })
    .transform((v) => Number(v)),
  descricao: z.string().trim().max(280, "Descrição muito longa").optional(),
});

const salasServicoListSchema = z
  .string()
  .transform((v, ctx) => {
    try {
      return z.array(salaServicoSchema).parse(JSON.parse(v || "[]"));
    } catch {
      ctx.addIssue({ code: "custom", message: "Salas do serviço inválidas." });
      return z.NEVER;
    }
  })
  .refine((salas) => new Set(salas.map((s) => s.salaId)).size === salas.length, {
    message: "Uma sala não pode se repetir na lista.",
  });

const profissionaisServicoSchema = z.string().transform((v, ctx) => {
  try {
    return z.array(z.string().min(1)).parse(JSON.parse(v || "[]"));
  } catch {
    ctx.addIssue({ code: "custom", message: "Profissionais do serviço inválidos." });
    return z.NEVER;
  }
});

/** Percentual (0-100) retido pela clínica sobre cada atendimento deste serviço. */
const percentualSchema = z
  .string()
  .trim()
  .min(1, "Taxa é obrigatória")
  .transform((v) => v.replace(/\./g, "").replace(",", "."))
  .refine((v) => !Number.isNaN(Number(v)) && Number(v) >= 0 && Number(v) <= 100, {
    message: "Taxa inválida (0 a 100)",
  })
  .transform((v) => Number(v));

/**
 * Serviço customizado (Psicologia, Nutrição etc.) fora do fluxo de Plano — sem sala ou
 * profissional é permitido (nesse caso o agendamento manual não checa capacidade/filtro).
 */
export const servicoSchema = z.object({
  nome: z.string().trim().min(2, "Nome deve ter ao menos 2 caracteres"),
  ativo: z.boolean().default(true),
  valorPadrao: valorSchema,
  taxaProfissionalPercentual: percentualSchema,
  salas: salasServicoListSchema,
  profissionais: profissionaisServicoSchema,
});

const dataVencimentoSchema = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Data de vencimento inválida");

/**
 * Pagamento do agendamento avulso de serviço (`criarAgendamentoServico`): valor
 * digitado na hora (pré-preenchido com `Servico.valorPadrao`, mas editável) +
 * parcelamento igual ao de alocação de plano, sem o conceito de periodicidade
 * (`maxParcelasPlano("TRIMESTRAL", forma)` já dá a regra certa: à vista → 1,
 * até 3x no cartão → 3). Nota fiscal já vem sempre inclusa no valor (sem toggle
 * nem sobretaxa), igual ao Plano — `Cobranca.notaFiscal` é sempre `true`.
 */
export const agendamentoServicoPagamentoSchema = z
  .object({
    valor: z.number().positive("Valor inválido"),
    formaPagamento: z.enum(formaPagamentoPlanoValues, {
      error: "Selecione a forma de pagamento",
    }),
    vencimentos: z
      .array(dataVencimentoSchema)
      .min(1, "Adicione ao menos uma parcela com data de vencimento"),
  })
  .superRefine((data, ctx) => {
    const max = maxParcelasPlano("TRIMESTRAL", data.formaPagamento);
    if (data.vencimentos.length > max) {
      ctx.addIssue({
        code: "custom",
        message:
          data.formaPagamento === "ATE_3X_CARTAO"
            ? `Até 3x no cartão permite no máximo ${max} parcelas`
            : "À vista permite no máximo 1 parcela",
        path: ["vencimentos"],
      });
    }
  });
