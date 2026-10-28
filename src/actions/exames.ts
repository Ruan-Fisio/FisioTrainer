"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { coresAlinhadasParaPersistir } from "@/lib/cor-opcao";
import { pontuacoesAlinhadasParaPersistir } from "@/lib/pontuacao-opcao";
import { exameParaDraft, type ExameDraft } from "@/lib/exame-draft";
import {
  ehRegistroNaoEncontrado,
  exameAlteradoDesde,
  parseCarregadoEm,
} from "@/lib/exame-edicao-concorrente";
import { comporMapas, mapaDeOrigem } from "@/lib/exame-merge";
import { exameSchema } from "@/lib/validations/exame";

const PAGE_SIZE = 10;

export async function listExames(
  filters: { q?: string; tipo?: "FISIOTERAPIA" | "EDUCACAO_FISICA" },
  page: number,
) {
  const where = {
    versaoAtual: true,
    ...(filters.q
      ? { nome: { contains: filters.q, mode: "insensitive" as const } }
      : {}),
    ...(filters.tipo ? { tipo: filters.tipo } : {}),
  };

  const [exames, total] = await Promise.all([
    prisma.exame.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: {
        _count: { select: { secoes: true, execucoes: true } },
      },
    }),
    prisma.exame.count({ where }),
  ]);

  return {
    exames,
    total,
    totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
    page,
  };
}

export async function getExame(id: string) {
  return prisma.exame.findUnique({
    where: { id },
    include: {
      secoes: {
        orderBy: { ordem: "asc" },
        include: {
          campos: {
            orderBy: { ordem: "asc" },
            include: {
              colunas: { orderBy: { ordem: "asc" } },
            },
          },
        },
      },
    },
  });
}

export type ExameActionState = {
  error?: string;
  /** Path do issue de zod que gerou `error` (ex. `["secoes", 0, "campos", 1,
   * "colunas", 2, "opcoesCondicionais", 0, "formula"]`) — a tela de cadastro
   * usa isso pra rolar até o campo problemático em vez de só mostrar a
   * mensagem solta no rodapé do formulário. */
  errorPath?: (string | number)[];
  success?: boolean;
};

function parseExameForm(formData: FormData) {
  const nome = formData.get("nome");
  const descricao = formData.get("descricao");
  const tipo = formData.get("tipo");
  const sombra = formData.get("sombra") === "true";
  const secoesRaw = formData.get("secoes");
  const variaveisRaw = formData.get("variaveis");
  const tabelasRaw = formData.get("tabelas");

  let secoes: unknown = [];
  let variaveis: unknown = [];
  let tabelas: unknown = [];

  try {
    secoes = secoesRaw ? JSON.parse(String(secoesRaw)) : [];
    variaveis = variaveisRaw ? JSON.parse(String(variaveisRaw)) : [];
    tabelas = tabelasRaw ? JSON.parse(String(tabelasRaw)) : [];
  } catch {
    return null;
  }

  return exameSchema.safeParse({ nome, descricao, tipo, sombra, secoes, variaveis, tabelas });
}

const OPCOES_MEMBRO = ["Esquerdo", "Direito", "Bilateral"];

type ExameFormData = ReturnType<typeof exameSchema.parse>;
type SecaoInput = ExameFormData["secoes"][number];
type CampoInput = SecaoInput["campos"][number];
type ColunaInput = CampoInput["colunas"][number];

/**
 * Monta o payload de uma coluna, tanto para `create` quanto para `update`
 * (nenhum dos dois precisa de `campoId`/`id`, que vêm do aninhamento).
 */
function colunaData(coluna: ColunaInput, ordem: number) {
  return {
    titulo: coluna.titulo,
    ordem,
    tipo: coluna.tipo,
    formatacao: coluna.formatacao || null,
    opcoes:
      coluna.tipo === "MULTIPLA_ESCOLHA" || coluna.tipo === "MEMBRO"
        ? coluna.opcoes
        : [],
    multiplaSelecao:
      coluna.tipo === "MULTIPLA_ESCOLHA" ? coluna.multiplaSelecao : false,
    opcoesCondicionais:
      coluna.tipo === "MULTIPLA_ESCOLHA" ? coluna.opcoesCondicionais : [],
    coresOpcoes:
      coluna.tipo === "MULTIPLA_ESCOLHA"
        ? coresAlinhadasParaPersistir(coluna.opcoes, coluna.coresOpcoes)
        : [],
    pontuacoes:
      coluna.tipo === "MULTIPLA_ESCOLHA" && coluna.usaPontuacao
        ? pontuacoesAlinhadasParaPersistir(coluna.opcoes, coluna.pontuacoes)
        : [],
    permiteAnexo: coluna.tipo === "CALCULADO" ? false : coluna.permiteAnexo,
    valorIdeal:
      coluna.tipo === "NUMERO" && coluna.valorIdeal ? coluna.valorIdeal : null,
    direcaoIdeal: coluna.tipo === "NUMERO" ? coluna.direcaoIdeal || null : null,
    formula: coluna.tipo === "CALCULADO" ? coluna.formula || null : null,
  };
}

function temGoniometria(campo: CampoInput) {
  return campo.colunas.some((c) => c.tipo === "GONIOMETRIA");
}

/**
 * A coluna "Membro" é injetada automaticamente em campos repetíveis que
 * identificam o membro avaliado — ela não passa pelo formulário.
 */
function precisaColunaMembro(campo: CampoInput) {
  return campo.repetivel && campo.identificarMembro && !temGoniometria(campo);
}

function colunaMembroInput(id?: string): ColunaInput & { id?: string } {
  return {
    id,
    titulo: "Membro",
    tipo: "MEMBRO" as ColunaInput["tipo"],
    formatacao: "",
    opcoes: OPCOES_MEMBRO,
    multiplaSelecao: false,
    opcoesCondicionais: [],
    coresOpcoes: [],
    usaPontuacao: false,
    pontuacoes: [],
    permiteAnexo: false,
    valorIdeal: "",
    direcaoIdeal: undefined,
  };
}

/** Colunas de um campo já com a "Membro" injetada quando necessário. */
function colunasComMembro(
  campo: CampoInput,
  membroId?: string,
): (ColunaInput & { id?: string })[] {
  return precisaColunaMembro(campo)
    ? [colunaMembroInput(membroId), ...campo.colunas]
    : campo.colunas;
}

function campoIdentificaMembro(campo: CampoInput) {
  return (campo.repetivel || temGoniometria(campo)) && campo.identificarMembro;
}

/**
 * Como os ids do form viram registros novos. "manter": o item é criado com o
 * id que o form mandou (do banco ou gerado no cliente — a edição em tempo real
 * precisa reconhecer o item antes e depois de gravado). "origem": versão nova
 * do exame — ids novos, e o do form vai para `origemId`, de onde sai o mapa
 * id antigo → novo para quem estava editando a versão anterior.
 */
type ModoIds = "manter" | "origem";

function idsCriacao(id: string | undefined, modo: ModoIds) {
  if (!id) return {};
  return modo === "manter" ? { id } : { origemId: id };
}

function campoCreateData(campo: CampoInput, ordem: number, modo: ModoIds) {
  return {
    ...idsCriacao(campo.id, modo),
    nome: campo.nome,
    ordem,
    repetivel: campo.repetivel,
    identificarMembro: campoIdentificaMembro(campo),
    colunas: {
      create: colunasComMembro(campo).map((coluna, i) => ({
        ...idsCriacao(coluna.id, modo),
        ...colunaData(coluna, i),
      })),
    },
  };
}

function secaoCreateData(secao: SecaoInput, ordem: number, modo: ModoIds) {
  return {
    ...idsCriacao(secao.id, modo),
    nome: secao.nome,
    ordem,
    campos: {
      create: secao.campos.map((campo, i) => campoCreateData(campo, i, modo)),
    },
  };
}

function secoesCreateData(secoes: ExameFormData["secoes"], modo: ModoIds) {
  return secoes.map((secao, i) => secaoCreateData(secao, i, modo));
}

export async function createExame(
  _prevState: ExameActionState,
  formData: FormData,
): Promise<ExameActionState> {
  const parsed = parseExameForm(formData);

  if (!parsed || !parsed.success) {
    const issue = parsed?.error.issues[0];
    return {
      error: issue?.message ?? "Dados inválidos.",
      errorPath: issue?.path as (string | number)[] | undefined,
    };
  }

  await prisma.exame.create({
    data: {
      nome: parsed.data.nome,
      descricao: parsed.data.descricao || null,
      tipo: parsed.data.tipo,
      sombra: parsed.data.sombra,
      variaveis: parsed.data.variaveis,
      tabelas: parsed.data.tabelas,
      secoes: { create: secoesCreateData(parsed.data.secoes, "manter") },
    },
  });

  revalidatePath("/exames");
  return { success: true };
}

/**
 * Atualiza um exame preservando os registros existentes de seção/campo/coluna
 * sempre que possível (fazendo update em vez de apagar e recriar), para não
 * derrubar em cascata os valores de execuções (avaliações) já registradas
 * pelos pacientes. Só é deletado o que o usuário de fato removeu do formulário.
 *
 * Usada apenas quando o exame ainda não tem nenhuma avaliação registrada —
 * nesse caso não há histórico a proteger, então editar em cima do mesmo
 * registro é seguro e evita acumular versões de um modelo que nunca foi usado.
 *
 * Tudo é enviado como um único nested write do Prisma (`exame.update` com
 * `deleteMany`/`update`/`create` aninhados). Isso é atômico e evita a
 * transação interativa com dezenas de round-trips sequenciais, que estourava
 * o timeout de 5s no pooler do Neon em produção para exames com muitas
 * colunas (erro P2028).
 */
async function updateExameInPlace(
  id: string,
  data: ExameFormData,
  carregadoEm: Date | null,
) {
  const existente = await prisma.exame.findUniqueOrThrow({
    where: { id },
    include: {
      secoes: { include: { campos: { include: { colunas: true } } } },
    },
  });

  type SecaoExistente = (typeof existente.secoes)[number];
  type CampoExistente = SecaoExistente["campos"][number];

  const idsMantidos = <T extends { id?: string }>(itens: T[]) =>
    itens.map((i) => i.id).filter((v): v is string => Boolean(v));

  const colunasNested = (campo: CampoInput, campoExistente: CampoExistente) => {
    const membroExistente = campoExistente.colunas.find(
      (c) => c.tipo === "MEMBRO",
    );
    const colunasInput = colunasComMembro(campo, membroExistente?.id);
    const mantidos = idsMantidos(colunasInput);

    return {
      deleteMany: mantidos.length > 0 ? { id: { notIn: mantidos } } : {},
      update: colunasInput.flatMap((coluna, i) => {
        const atual = campoExistente.colunas.find((c) => c.id === coluna.id);
        return atual
          ? [{ where: { id: atual.id }, data: colunaData(coluna, i) }]
          : [];
      }),
      create: colunasInput.flatMap((coluna, i) => {
        const atual = campoExistente.colunas.find((c) => c.id === coluna.id);
        return atual
          ? []
          : [{ ...idsCriacao(coluna.id, "manter"), ...colunaData(coluna, i) }];
      }),
    };
  };

  const camposNested = (secao: SecaoInput, secaoExistente: SecaoExistente) => {
    const mantidos = idsMantidos(secao.campos);

    return {
      deleteMany: mantidos.length > 0 ? { id: { notIn: mantidos } } : {},
      update: secao.campos.flatMap((campo, i) => {
        const campoExistente = secaoExistente.campos.find(
          (c) => c.id === campo.id,
        );
        if (!campoExistente) return [];
        return [
          {
            where: { id: campoExistente.id },
            data: {
              nome: campo.nome,
              ordem: i,
              repetivel: campo.repetivel,
              identificarMembro: campoIdentificaMembro(campo),
              colunas: colunasNested(campo, campoExistente),
            },
          },
        ];
      }),
      create: secao.campos.flatMap((campo, i) => {
        const campoExistente = secaoExistente.campos.find(
          (c) => c.id === campo.id,
        );
        return campoExistente ? [] : [campoCreateData(campo, i, "manter")];
      }),
    };
  };

  const secoesMantidas = idsMantidos(data.secoes);

  await prisma.exame.update({
    where: { id, ...(carregadoEm ? { updatedAt: carregadoEm } : {}) },
    data: {
      nome: data.nome,
      descricao: data.descricao || null,
      tipo: data.tipo,
      sombra: data.sombra,
      variaveis: data.variaveis,
      tabelas: data.tabelas,
      secoes: {
        deleteMany:
          secoesMantidas.length > 0 ? { id: { notIn: secoesMantidas } } : {},
        update: data.secoes.flatMap((secao, i) => {
          const secaoExistente = existente.secoes.find(
            (s) => s.id === secao.id,
          );
          if (!secaoExistente) return [];
          return [
            {
              where: { id: secaoExistente.id },
              data: {
                nome: secao.nome,
                ordem: i,
                campos: camposNested(secao, secaoExistente),
              },
            },
          ];
        }),
        create: data.secoes.flatMap((secao, i) => {
          const secaoExistente = existente.secoes.find(
            (s) => s.id === secao.id,
          );
          return secaoExistente ? [] : [secaoCreateData(secao, i, "manter")];
        }),
      },
    },
  });
}

/**
 * Cria uma nova versão do exame a partir da estrutura editada e arquiva a
 * versão atual (`versaoAtual: false`), sem tocar em nenhuma de suas
 * seções/campos/colunas. Usada quando o exame já tem avaliações registradas:
 * elas continuam apontando para a versão antiga, intacta; só as avaliações
 * futuras passam a usar a versão nova.
 */
async function criarNovaVersaoExame(
  id: string,
  data: ExameFormData,
  carregadoEm: Date | null,
): Promise<string> {
  const [, nova] = await prisma.$transaction([
    prisma.exame.update({
      where: {
        id,
        versaoAtual: true,
        ...(carregadoEm ? { updatedAt: carregadoEm } : {}),
      },
      data: { versaoAtual: false },
    }),
    prisma.exame.create({
      data: {
        nome: data.nome,
        descricao: data.descricao || null,
        tipo: data.tipo,
        sombra: data.sombra,
        variaveis: data.variaveis,
        tabelas: data.tabelas,
        versaoAtual: true,
        exameOrigemId: id,
        secoes: { create: secoesCreateData(data.secoes, "origem") },
      },
    }),
  ]);
  return nova.id;
}

/**
 * Segue a cadeia de versões a partir de `id` até a atual, compondo o mapa de
 * ids (seção/campo/coluna) antigo → novo. Quem editava uma versão que foi
 * arquivada continua editando a atual sem perder o rascunho.
 */
async function resolverVersaoAtual(
  id: string,
): Promise<{ id: string; mapaIds: Record<string, string> } | null> {
  let atual = await prisma.exame.findUnique({
    where: { id },
    select: { id: true, versaoAtual: true },
  });
  let mapaIds: Record<string, string> = {};
  for (let salto = 0; atual && !atual.versaoAtual && salto < 50; salto++) {
    const proxima = await prisma.exame.findFirst({
      where: { exameOrigemId: atual.id },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        versaoAtual: true,
        secoes: {
          select: {
            id: true,
            origemId: true,
            campos: {
              select: {
                id: true,
                origemId: true,
                colunas: { select: { id: true, origemId: true } },
              },
            },
          },
        },
      },
    });
    if (!proxima) return null;
    mapaIds = comporMapas(mapaIds, mapaDeOrigem(proxima.secoes));
    atual = proxima;
  }
  return atual?.versaoAtual ? { id: atual.id, mapaIds } : null;
}

/** Presença "também está editando": válida por este tempo sem heartbeat. */
const PRESENCA_VALIDADE_MS = 30_000;

/** Registra que o usuário logado está editando `exameId` e devolve os nomes dos outros. */
async function registrarPresenca(exameId: string): Promise<string[]> {
  const usuario = (await auth())?.user;
  const agora = Date.now();
  if (usuario?.id) {
    const usuarioNome = usuario.name || usuario.email || "Alguém";
    await prisma.exameEdicaoPresenca.upsert({
      where: { exameId_usuarioId: { exameId, usuarioId: usuario.id } },
      create: { exameId, usuarioId: usuario.id, usuarioNome },
      update: { vistoEm: new Date(agora), usuarioNome },
    });
  }
  // Limpeza barata (índice em vistoEm) das presenças abandonadas.
  await prisma.exameEdicaoPresenca.deleteMany({
    where: { vistoEm: { lt: new Date(agora - 24 * 60 * 60 * 1000) } },
  });
  const outros = await prisma.exameEdicaoPresenca.findMany({
    where: {
      exameId,
      vistoEm: { gte: new Date(agora - PRESENCA_VALIDADE_MS) },
      ...(usuario?.id ? { NOT: { usuarioId: usuario.id } } : {}),
    },
    orderBy: { usuarioNome: "asc" },
    select: { usuarioNome: true },
  });
  return outros.map((o) => o.usuarioNome);
}

export type SincronizacaoExame = {
  /** Id da versão atual (muda quando o exame em uso ganha versão nova). */
  id: string;
  /** `updatedAt` (ISO) da versão atual — trava otimista do próximo salvamento. */
  carregadoEm: string;
  draft: ExameDraft;
  /** Ids antigos → novos, quando o `id` pedido já foi arquivado. */
  mapaIds: Record<string, string>;
  /** Outras pessoas com esta edição aberta agora. */
  editores: string[];
  /** Quem gravou a versão atual por último (trilha de auditoria) e quando. */
  ultimaAlteracao: { por: string | null; em: string } | null;
};

/** Estado atual do exame para a edição em tempo real (e heartbeat de presença). */
export async function sincronizarExame(id: string): Promise<SincronizacaoExame | null> {
  const versao = await resolverVersaoAtual(id);
  if (!versao) return null;
  const exame = await getExame(versao.id);
  if (!exame) return null;
  const [editores, ultimoLog] = await Promise.all([
    registrarPresenca(exame.id),
    prisma.auditLog.findFirst({
      where: { modulo: "Exame", registroId: exame.id },
      orderBy: { criadoEm: "desc" },
      select: { usuarioNome: true, criadoEm: true },
    }),
  ]);
  return {
    id: exame.id,
    carregadoEm: exame.updatedAt.toISOString(),
    draft: exameParaDraft(exame),
    mapaIds: versao.mapaIds,
    editores,
    ultimaAlteracao: ultimoLog
      ? { por: ultimoLog.usuarioNome, em: ultimoLog.criadoEm.toISOString() }
      : null,
  };
}

/** Fechou a tela de edição: some da lista "também está editando". */
export async function sairDaEdicaoExame(id: string) {
  const usuario = (await auth())?.user;
  if (!usuario?.id) return;
  await prisma.exameEdicaoPresenca.deleteMany({
    where: { exameId: id, usuarioId: usuario.id },
  });
}

export type AutosalvarExameResultado =
  | { ok: true; sincronizacao: SincronizacaoExame }
  /** Alguém salvou desde `carregadoEm`: o cliente mescla e tenta de novo. */
  | { ok: false; conflito: true }
  | { ok: false; conflito?: false; error: string; errorPath?: (string | number)[] };

/**
 * Salvamento automático da edição em tempo real. O cliente já mesclou o
 * rascunho com a versão `carregadoEm`; se outra pessoa gravou nesse meio-tempo,
 * nada é gravado (`conflito`) — o cliente sincroniza, mescla e tenta de novo.
 * Rascunho inválido (fórmula, tabela, campo obrigatório) não é gravado.
 */
export async function autosalvarExame(
  id: string,
  dados: ExameDraft,
  carregadoEm: string,
): Promise<AutosalvarExameResultado> {
  const parsed = exameSchema.safeParse(dados);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return {
      ok: false,
      error: issue?.message ?? "Dados inválidos.",
      errorPath: issue?.path as (string | number)[] | undefined,
    };
  }

  const carregado = parseCarregadoEm(carregadoEm);
  const atual = await prisma.exame.findUnique({
    where: { id },
    select: { versaoAtual: true, updatedAt: true },
  });
  if (!carregado || exameAlteradoDesde(atual, carregado)) {
    return { ok: false, conflito: true };
  }

  const emUso =
    (await prisma.exameExecucao.count({ where: { exameId: id } })) > 0;

  try {
    if (emUso) {
      await criarNovaVersaoExame(id, parsed.data, carregado);
    } else {
      await updateExameInPlace(id, parsed.data, carregado);
    }
  } catch (erro) {
    // Alguém salvou entre a checagem e a escrita: o `where` com `updatedAt`
    // não bate e nada é gravado.
    if (ehRegistroNaoEncontrado(erro)) return { ok: false, conflito: true };
    throw erro;
  }

  // Sem revalidatePath aqui de propósito: numa server action ele faz o Next
  // re-renderizar a página atual — a edição pulava para o topo (e, com versão
  // nova, redirecionava pela URL nova, trocando o form pelo skeleton). A
  // listagem /exames é dinâmica e busca dados novos ao navegar.
  // A partir do id antigo: se virou versão nova, o mapa de ids vem junto.
  const sincronizacao = await sincronizarExame(id);
  if (!sincronizacao) return { ok: false, conflito: true };
  return { ok: true, sincronizacao };
}

export async function deleteExame(id: string) {
  const exame = await prisma.exame.findUnique({
    where: { id },
    include: { _count: { select: { execucoes: true } } },
  });

  if (!exame) return;

  if (exame._count.execucoes > 0) {
    throw new Error("Exame em uso não pode ser excluído.");
  }

  await prisma.exame.delete({ where: { id } });
  revalidatePath("/exames");
}
