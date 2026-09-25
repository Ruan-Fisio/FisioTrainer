import { z } from "zod";
import { validarFormulasDoExame } from "@/lib/exame-formula";

export const exameColunaSchema = z
  .object({
    id: z.string().trim().optional(),
    titulo: z.string().trim().min(1, "Título da coluna é obrigatório"),
    tipo: z.enum([
      "NUMERO",
      "TEXTO",
      "MULTIPLA_ESCOLHA",
      "SIM_NAO",
      "GONIOMETRIA",
      "MEMBRO",
      "CALCULADO",
    ]),
    formatacao: z.string().trim().optional(),
    opcoes: z.array(z.string().trim().min(1)).optional().default([]),
    multiplaSelecao: z.boolean().optional().default(false),
    opcoesCondicionais: z
      .array(
        z.object({
          opcao: z.string().trim().min(1),
          formula: z.string().trim().min(1),
        }),
      )
      .optional()
      .default([]),
    valorIdeal: z.string().trim().optional(),
    direcaoIdeal: z
      .enum(["MAIOR_MELHOR", "MENOR_MELHOR", "PROXIMO_IDEAL"])
      .optional(),
    formula: z.string().trim().optional(),
  })
  .refine(
    (coluna) =>
      coluna.tipo !== "MULTIPLA_ESCOLHA" || coluna.opcoes.length >= 2,
    {
      message: "Adicione ao menos duas opções para o campo de múltipla escolha",
      path: ["opcoes"],
    },
  )
  .refine(
    (coluna) =>
      coluna.tipo === "MULTIPLA_ESCOLHA" || coluna.opcoesCondicionais.length === 0,
    {
      message: "Condições automáticas só se aplicam a colunas de múltipla escolha",
      path: ["opcoesCondicionais"],
    },
  );

export const exameCampoSchema = z.object({
  id: z.string().trim().optional(),
  nome: z.string().trim().optional().default(""),
  repetivel: z.boolean().optional().default(false),
  identificarMembro: z.boolean().optional().default(false),
  colunas: z
    .array(exameColunaSchema)
    .min(1, "Adicione ao menos uma coluna"),
});

export const exameSecaoSchema = z.object({
  id: z.string().trim().optional(),
  nome: z.string().trim().min(1, "Nome da seção é obrigatório"),
  campos: z.array(exameCampoSchema).min(1, "Adicione ao menos um campo"),
});

export const exameSchema = z
  .object({
    nome: z.string().trim().min(2, "Nome deve ter ao menos 2 caracteres"),
    descricao: z.string().trim().optional(),
    tipo: z.enum(["FISIOTERAPIA", "EDUCACAO_FISICA"]),
    sombra: z.boolean().optional().default(false),
    secoes: z.array(exameSecaoSchema).min(1, "Adicione ao menos uma seção"),
  })
  .superRefine((exame, ctx) => {
    const colunasEmOrdem = exame.secoes.flatMap((secao) =>
      secao.campos.flatMap((campo) =>
        campo.colunas.map((coluna) => ({
          titulo: coluna.titulo,
          tipo: coluna.tipo,
          formula: coluna.formula,
          repetivel: campo.repetivel,
          opcoes: coluna.opcoes,
          opcoesCondicionais: coluna.opcoesCondicionais,
        })),
      ),
    );
    const erro = validarFormulasDoExame(colunasEmOrdem);
    if (erro) {
      ctx.addIssue({ code: "custom", message: erro, path: ["secoes"] });
    }
  });
