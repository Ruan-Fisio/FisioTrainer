import { z } from "zod";
import { validarFormulasDoExameDetalhado } from "@/lib/exame-formula";

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
          // Sem min(1) de propósito: uma condição vazia é um estado válido
          // enquanto o usuário preenche o formulário. `validarFormulasDoExame`
          // (chamada no superRefine de `exameSchema`) é quem barra o submit
          // com uma mensagem que aponta a opção/coluna exatas — um min(1) aqui
          // faria o zod falhar antes, com uma mensagem genérica e sem contexto.
          formula: z.string().trim().optional().default(""),
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
    // Mesma travessia (seção → campo → coluna) que gera `colunasEmOrdem" para
    // o validador, guardando em paralelo as coordenadas de cada uma — assim
    // dá pra converter o `colunaIndex`/`opcaoIndex` (posições no array achatado)
    // de volta num `path` de zod que aponta pro campo exato na árvore de
    // `secoes`, e a tela de cadastro rola até lá em vez de só mostrar a
    // mensagem solta no rodapé do formulário.
    const colunasEmOrdem: {
      titulo: string;
      tipo: string;
      formula?: string;
      repetivel: boolean;
      opcoes: string[];
      opcoesCondicionais: { opcao: string; formula: string }[];
    }[] = [];
    const coordenadas: { secaoIndex: number; campoIndex: number; colunaIndex: number }[] = [];

    exame.secoes.forEach((secao, secaoIndex) => {
      secao.campos.forEach((campo, campoIndex) => {
        campo.colunas.forEach((coluna, colunaIndex) => {
          colunasEmOrdem.push({
            titulo: coluna.titulo,
            tipo: coluna.tipo,
            formula: coluna.formula,
            repetivel: campo.repetivel,
            opcoes: coluna.opcoes,
            opcoesCondicionais: coluna.opcoesCondicionais,
          });
          coordenadas.push({ secaoIndex, campoIndex, colunaIndex });
        });
      });
    });

    const erro = validarFormulasDoExameDetalhado(colunasEmOrdem);
    if (erro) {
      const coordenada = coordenadas[erro.colunaIndex];
      const path: (string | number)[] = coordenada
        ? [
            "secoes",
            coordenada.secaoIndex,
            "campos",
            coordenada.campoIndex,
            "colunas",
            coordenada.colunaIndex,
            ...(erro.opcaoIndex !== undefined
              ? ["opcoesCondicionais", erro.opcaoIndex, "formula"]
              : []),
          ]
        : ["secoes"];
      ctx.addIssue({ code: "custom", message: erro.mensagem, path });
    }
  });
