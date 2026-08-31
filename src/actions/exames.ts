"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
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
  success?: boolean;
};

function parseExameForm(formData: FormData) {
  const nome = formData.get("nome");
  const descricao = formData.get("descricao");
  const tipo = formData.get("tipo");
  const secoesRaw = formData.get("secoes");

  let secoes: unknown = [];

  try {
    secoes = secoesRaw ? JSON.parse(String(secoesRaw)) : [];
  } catch {
    return null;
  }

  return exameSchema.safeParse({ nome, descricao, tipo, secoes });
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
    valorIdeal:
      coluna.tipo === "NUMERO" && coluna.valorIdeal ? coluna.valorIdeal : null,
    direcaoIdeal: coluna.tipo === "NUMERO" ? coluna.direcaoIdeal || null : null,
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

function campoCreateData(campo: CampoInput, ordem: number) {
  return {
    nome: campo.nome,
    ordem,
    repetivel: campo.repetivel,
    identificarMembro: campoIdentificaMembro(campo),
    colunas: {
      create: colunasComMembro(campo).map((coluna, i) => colunaData(coluna, i)),
    },
  };
}

function secaoCreateData(secao: SecaoInput, ordem: number) {
  return {
    nome: secao.nome,
    ordem,
    campos: {
      create: secao.campos.map((campo, i) => campoCreateData(campo, i)),
    },
  };
}

function secoesCreateData(secoes: ExameFormData["secoes"]) {
  return secoes.map((secao, i) => secaoCreateData(secao, i));
}

export async function createExame(
  _prevState: ExameActionState,
  formData: FormData,
): Promise<ExameActionState> {
  const parsed = parseExameForm(formData);

  if (!parsed || !parsed.success) {
    return {
      error: parsed?.error.issues[0]?.message ?? "Dados inválidos.",
    };
  }

  await prisma.exame.create({
    data: {
      nome: parsed.data.nome,
      descricao: parsed.data.descricao || null,
      tipo: parsed.data.tipo,
      secoes: { create: secoesCreateData(parsed.data.secoes) },
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
async function updateExameInPlace(id: string, data: ExameFormData) {
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
        return atual ? [] : [colunaData(coluna, i)];
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
        return campoExistente ? [] : [campoCreateData(campo, i)];
      }),
    };
  };

  const secoesMantidas = idsMantidos(data.secoes);

  await prisma.exame.update({
    where: { id },
    data: {
      nome: data.nome,
      descricao: data.descricao || null,
      tipo: data.tipo,
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
          return secaoExistente ? [] : [secaoCreateData(secao, i)];
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
async function criarNovaVersaoExame(id: string, data: ExameFormData) {
  await prisma.$transaction([
    prisma.exame.update({ where: { id }, data: { versaoAtual: false } }),
    prisma.exame.create({
      data: {
        nome: data.nome,
        descricao: data.descricao || null,
        tipo: data.tipo,
        versaoAtual: true,
        exameOrigemId: id,
        secoes: { create: secoesCreateData(data.secoes) },
      },
    }),
  ]);
}

export async function updateExame(
  id: string,
  _prevState: ExameActionState,
  formData: FormData,
): Promise<ExameActionState> {
  const parsed = parseExameForm(formData);

  if (!parsed || !parsed.success) {
    return {
      error: parsed?.error.issues[0]?.message ?? "Dados inválidos.",
    };
  }

  const emUso =
    (await prisma.exameExecucao.count({ where: { exameId: id } })) > 0;

  if (emUso) {
    await criarNovaVersaoExame(id, parsed.data);
  } else {
    await updateExameInPlace(id, parsed.data);
  }

  revalidatePath("/exames");
  return { success: true };
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
