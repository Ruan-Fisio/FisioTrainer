import { z } from "zod";
import { CORES_OPCAO } from "@/lib/cor-opcao";
import { validarFormulasDoExameDetalhado } from "@/lib/exame-formula";
import { parsePontosTexto, type OpcaoPontuada } from "@/lib/pontuacao-opcao";
import { compilarTabelas, validarTabelas } from "@/lib/tabela-referencia";

// Id de seção/campo/coluna: o do banco, ou um gerado no cliente para item novo
// (a edição em tempo real precisa de identidade estável antes de gravar).
const idItemSchema = z
  .string()
  .regex(/^[A-Za-z0-9_-]{1,64}$/, "Identificador inválido")
  .optional();

export const exameColunaSchema = z
  .object({
    id: idItemSchema,
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
    // Alinhado por índice com `opcoes` ("" = sem cor); a action converte pro
    // formato persistido `{opcao, cor}[]` (ver `coresAlinhadasParaPersistir`).
    coresOpcoes: z
      .array(z.enum(["", ...CORES_OPCAO]))
      .optional()
      .default([]),
    // Pontos por opção como texto, alinhado por índice com `opcoes` (permite
    // digitar "-" ou "1,5"). Só vale com `usaPontuacao`; conteúdo é validado
    // em `validarFormulasDoExameDetalhado` (mensagem aponta opção/coluna).
    usaPontuacao: z.boolean().optional().default(false),
    pontuacoes: z.array(z.string()).optional().default([]),
    /** A coluna aceita anexos (arquivos) na execução do exame. */
    permiteAnexo: z.boolean().optional().default(false),
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
  )
  .refine((coluna) => coluna.tipo === "MULTIPLA_ESCOLHA" || !coluna.usaPontuacao, {
    message: "Pontuação só se aplica a colunas de múltipla escolha",
    path: ["usaPontuacao"],
  });

export const exameCampoSchema = z.object({
  id: idItemSchema,
  nome: z.string().trim().optional().default(""),
  repetivel: z.boolean().optional().default(false),
  identificarMembro: z.boolean().optional().default(false),
  colunas: z
    .array(exameColunaSchema)
    .min(1, "Adicione ao menos uma coluna"),
});

export const exameSecaoSchema = z.object({
  id: idItemSchema,
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
    // Sem validação de conteúdo aqui de propósito (ver nota em opcoesCondicionais):
    // `validarFormulasDoExameDetalhado` barra com mensagem contextual.
    variaveis: z
      .array(
        z.object({
          nome: z.string().trim().optional().default(""),
          formula: z.string().trim().optional().default(""),
        }),
      )
      .optional()
      .default([]),
    // Conteúdo validado em `validarTabelas` (mensagem contextual), não aqui.
    tabelas: z
      .array(
        z.object({
          id: z.string().max(80).optional(),
          nome: z.string().trim().optional().default(""),
          chaves: z.array(z.string()).optional().default([]),
          saidas: z.array(z.string()).optional().default([]),
          linhas: z
            .array(
              z.object({
                faixas: z
                  .array(
                    z.object({
                      min: z.string().optional().default(""),
                      max: z.string().optional().default(""),
                    }),
                  )
                  .optional()
                  .default([]),
                valores: z.array(z.string()).optional().default([]),
              }),
            )
            .optional()
            .default([]),
        }),
      )
      .optional()
      .default([]),
  })
  .superRefine((exame, ctx) => {
    const erroTabela = validarTabelas(exame.tabelas);
    if (erroTabela) {
      ctx.addIssue({
        code: "custom",
        message: erroTabela.mensagem,
        path: ["tabelas", erroTabela.tabelaIndex],
      });
      return;
    }

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
      pontuacoes: OpcaoPontuada[];
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
            // Coluna com `usaPontuacao` mas pontos faltando/inválidos: o
            // validador precisa enxergá-la como pontuada para apontar a opção.
            pontuacoes: coluna.usaPontuacao
              ? coluna.opcoes.map((opcao, i) => ({
                  opcao,
                  pontos: parsePontosTexto(coluna.pontuacoes[i] ?? "") ?? Number.NaN,
                }))
              : [],
          });
          coordenadas.push({ secaoIndex, campoIndex, colunaIndex });
        });
      });
    });

    // As saídas das tabelas entram como variáveis (depois das do usuário) — um
    // erro nelas aponta para a tabela de origem, não para a lista de variáveis.
    const variaveisTabelas = compilarTabelas(exame.tabelas);
    const erro = validarFormulasDoExameDetalhado(colunasEmOrdem, [
      ...exame.variaveis,
      ...variaveisTabelas,
    ]);
    if (erro && erro.variavelIndex !== undefined && erro.variavelIndex >= exame.variaveis.length) {
      const nomeVariavel = variaveisTabelas[erro.variavelIndex - exame.variaveis.length].nome;
      const tabelaIndex = exame.tabelas.findIndex((t) => nomeVariavel.startsWith(`${t.nome.trim()}.`));
      ctx.addIssue({
        code: "custom",
        message: erro.mensagem,
        path: ["tabelas", Math.max(tabelaIndex, 0)],
      });
    } else if (erro && erro.variavelIndex !== undefined) {
      ctx.addIssue({
        code: "custom",
        message: erro.mensagem,
        path: ["variaveis", erro.variavelIndex, "formula"],
      });
    } else if (erro) {
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
              ? erro.opcaoCampo === "pontuacoes"
                ? ["pontuacoes", erro.opcaoIndex]
                : ["opcoesCondicionais", erro.opcaoIndex, "formula"]
              : []),
          ]
        : ["secoes"];
      ctx.addIssue({ code: "custom", message: erro.mensagem, path });
    }
  });
