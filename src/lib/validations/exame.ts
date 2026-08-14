import { z } from "zod";

export const exameColunaSchema = z
  .object({
    titulo: z.string().trim().min(1, "Título da coluna é obrigatório"),
    tipo: z.enum([
      "NUMERO",
      "TEXTO",
      "MULTIPLA_ESCOLHA",
      "SIM_NAO",
      "GONIOMETRIA",
    ]),
    formatacao: z.string().trim().optional(),
    opcoes: z.array(z.string().trim().min(1)).optional().default([]),
    multiplaSelecao: z.boolean().optional().default(false),
    valorIdeal: z.string().trim().optional(),
    direcaoIdeal: z
      .enum(["MAIOR_MELHOR", "MENOR_MELHOR", "PROXIMO_IDEAL"])
      .optional(),
  })
  .refine(
    (coluna) =>
      coluna.tipo !== "MULTIPLA_ESCOLHA" || coluna.opcoes.length >= 2,
    {
      message: "Adicione ao menos duas opções para o campo de múltipla escolha",
      path: ["opcoes"],
    },
  );

export const exameCampoSchema = z.object({
  nome: z.string().trim().optional().default(""),
  repetivel: z.boolean().optional().default(false),
  colunas: z
    .array(exameColunaSchema)
    .min(1, "Adicione ao menos uma coluna"),
});

export const exameSecaoSchema = z.object({
  nome: z.string().trim().min(1, "Nome da seção é obrigatório"),
  campos: z.array(exameCampoSchema).min(1, "Adicione ao menos um campo"),
});

export const exameSchema = z.object({
  nome: z.string().trim().min(2, "Nome deve ter ao menos 2 caracteres"),
  descricao: z.string().trim().optional(),
  tipo: z.enum(["FISIOTERAPIA", "EDUCACAO_FISICA"]),
  secoes: z.array(exameSecaoSchema).min(1, "Adicione ao menos uma seção"),
});
