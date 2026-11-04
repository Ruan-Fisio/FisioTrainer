import { z } from "zod";
import { CATEGORIAS_DESPESA } from "@/lib/despesas";
import { toDateInputValue } from "@/lib/format";
import { combinarDataHora } from "@/lib/validations/agendamento";

const VALOR_MAXIMO = 99_999_999.99; // limite de Decimal(10, 2)

/**
 * Converte o valor digitado para número. A vírgula é sempre o decimal ("1.234,56"). Sem
 * vírgula, ponto seguido de 1 ou 2 dígitos no fim é decimal ("250.50") e seguido de 3 é
 * milhar ("1.500"). Retorna NaN para o que não for valor monetário.
 */
export function parseValorMonetario(texto: string): number {
  const t = texto.trim().replace(/^R\$\s*/i, "");
  let normalizado: string;
  if (/^\d{1,3}(\.\d{3})+(,\d{1,2})?$/.test(t)) {
    normalizado = t.replace(/\./g, "").replace(",", ".");
  } else if (/^\d+(,\d{1,2})?$/.test(t)) {
    normalizado = t.replace(",", ".");
  } else if (/^\d+\.\d{1,2}$/.test(t)) {
    normalizado = t;
  } else {
    return Number.NaN;
  }
  return Math.round(Number(normalizado) * 100) / 100;
}

/** "YYYY-MM-DD" que existe no calendário ("2026-02-31" não passa). */
function dataValida(v: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v) || v < "2000-01-01" || v > "2100-12-31") return false;
  const d = combinarDataHora(v, "12:00");
  return !Number.isNaN(d.getTime()) && toDateInputValue(d) === v;
}

const textoOpcional = z
  .string()
  .trim()
  .max(200, "Texto muito longo")
  .optional()
  .transform((v) => v || null);

export const despesaSchema = z
  .object({
    descricao: z.string().trim().min(1, "Descrição é obrigatória").max(200, "Descrição muito longa"),
    categoria: z.enum(CATEGORIAS_DESPESA, { message: "Selecione uma categoria" }),
    valor: z
      .string()
      .min(1, "Valor é obrigatório")
      .transform(parseValorMonetario)
      .refine((v) => !Number.isNaN(v) && v > 0 && v <= VALOR_MAXIMO, { message: "Valor inválido" }),
    data: z.string().trim().refine(dataValida, { message: "Data inválida" }),
    status: z.enum(["PENDENTE", "PAGO"]),
    pagoEm: z.string().trim().optional(),
    fornecedor: textoOpcional,
    numeroDocumento: textoOpcional,
    observacao: z
      .string()
      .trim()
      .max(2000, "Observação muito longa")
      .optional()
      .transform((v) => v || null),
  })
  .superRefine((d, ctx) => {
    if (d.status !== "PAGO") return;
    if (!d.pagoEm || !dataValida(d.pagoEm)) {
      ctx.addIssue({ code: "custom", path: ["pagoEm"], message: "Informe a data do pagamento" });
    } else if (d.pagoEm > toDateInputValue(new Date())) {
      ctx.addIssue({
        code: "custom",
        path: ["pagoEm"],
        message: "A data do pagamento não pode ser futura",
      });
    }
  })
  .transform((d) => ({
    ...d,
    data: combinarDataHora(d.data, "12:00"),
    // Pendente nunca guarda data de pagamento, mesmo se o campo veio preenchido.
    pagoEm: d.status === "PAGO" ? combinarDataHora(d.pagoEm!, "12:00") : null,
  }));
