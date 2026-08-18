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

function secoesCreateData(secoes: ReturnType<typeof exameSchema.parse>["secoes"]) {
  return secoes.map((secao, secaoIndex) => ({
    nome: secao.nome,
    ordem: secaoIndex,
    campos: {
      create: secao.campos.map((campo, campoIndex) => {
        const temGoniometria = campo.colunas.some(
          (coluna) => coluna.tipo === "GONIOMETRIA",
        );
        const colunasData = campo.colunas.map((coluna) => ({
          titulo: coluna.titulo,
          tipo: coluna.tipo,
          formatacao: coluna.formatacao || null,
          opcoes: coluna.tipo === "MULTIPLA_ESCOLHA" ? coluna.opcoes : [],
          multiplaSelecao:
            coluna.tipo === "MULTIPLA_ESCOLHA"
              ? coluna.multiplaSelecao
              : false,
          valorIdeal:
            coluna.tipo === "NUMERO" && coluna.valorIdeal
              ? coluna.valorIdeal
              : null,
          direcaoIdeal:
            coluna.tipo === "NUMERO" ? coluna.direcaoIdeal || null : null,
        }));

        if (campo.repetivel && campo.identificarMembro && !temGoniometria) {
          colunasData.unshift({
            titulo: "Membro",
            tipo: "MEMBRO",
            formatacao: null,
            opcoes: OPCOES_MEMBRO,
            multiplaSelecao: false,
            valorIdeal: null,
            direcaoIdeal: null,
          });
        }

        return {
          nome: campo.nome,
          ordem: campoIndex,
          repetivel: campo.repetivel,
          identificarMembro:
            (campo.repetivel || temGoniometria) && campo.identificarMembro,
          colunas: {
            create: colunasData.map((coluna, colunaIndex) => ({
              ...coluna,
              ordem: colunaIndex,
            })),
          },
        };
      }),
    },
  }));
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

type ColunaInput = ReturnType<typeof exameSchema.parse>["secoes"][number]["campos"][number]["colunas"][number];

function colunaUpdateData(coluna: ColunaInput, ordem: number) {
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

type ExameFormData = ReturnType<typeof exameSchema.parse>;

/**
 * Atualiza um exame preservando os registros existentes de seção/campo/coluna
 * sempre que possível (fazendo update em vez de apagar e recriar), para não
 * derrubar em cascata os valores de execuções (avaliações) já registradas
 * pelos pacientes. Só é deletado o que o usuário de fato removeu do formulário.
 *
 * Usada apenas quando o exame ainda não tem nenhuma avaliação registrada —
 * nesse caso não há histórico a proteger, então editar em cima do mesmo
 * registro é seguro e evita acumular versões de um modelo que nunca foi usado.
 */
async function updateExameInPlace(id: string, data: ExameFormData) {
  await prisma.$transaction(async (tx) => {
    const existente = await tx.exame.findUniqueOrThrow({
      where: { id },
      include: {
        secoes: { include: { campos: { include: { colunas: true } } } },
      },
    });

    await tx.exame.update({
      where: { id },
      data: {
        nome: data.nome,
        descricao: data.descricao || null,
        tipo: data.tipo,
      },
    });

    const secaoIdsRecebidos = new Set(
      data.secoes.map((s) => s.id).filter(Boolean),
    );
    for (const secaoExistente of existente.secoes) {
      if (!secaoIdsRecebidos.has(secaoExistente.id)) {
        await tx.exameSecao.delete({ where: { id: secaoExistente.id } });
      }
    }

    for (const [secaoIndex, secaoInput] of data.secoes.entries()) {
      const secaoExistente = existente.secoes.find(
        (s) => s.id === secaoInput.id,
      );

      const secaoId = secaoExistente
        ? secaoExistente.id
        : (
            await tx.exameSecao.create({
              data: { nome: secaoInput.nome, ordem: secaoIndex, exameId: id },
            })
          ).id;

      if (secaoExistente) {
        await tx.exameSecao.update({
          where: { id: secaoId },
          data: { nome: secaoInput.nome, ordem: secaoIndex },
        });
      }

      const camposExistentes = secaoExistente?.campos ?? [];
      const campoIdsRecebidos = new Set(
        secaoInput.campos.map((c) => c.id).filter(Boolean),
      );
      for (const campoExistente of camposExistentes) {
        if (!campoIdsRecebidos.has(campoExistente.id)) {
          await tx.exameCampo.delete({ where: { id: campoExistente.id } });
        }
      }

      for (const [campoIndex, campoInput] of secaoInput.campos.entries()) {
        const campoExistente = camposExistentes.find(
          (c) => c.id === campoInput.id,
        );
        const temGoniometria = campoInput.colunas.some(
          (c) => c.tipo === "GONIOMETRIA",
        );
        const identificarMembro =
          (campoInput.repetivel || temGoniometria) &&
          campoInput.identificarMembro;

        const campoData = {
          nome: campoInput.nome,
          ordem: campoIndex,
          repetivel: campoInput.repetivel,
          identificarMembro,
        };

        const campoId = campoExistente
          ? campoExistente.id
          : (
              await tx.exameCampo.create({
                data: { ...campoData, secaoId },
              })
            ).id;

        if (campoExistente) {
          await tx.exameCampo.update({
            where: { id: campoId },
            data: campoData,
          });
        }

        const colunasExistentes = campoExistente?.colunas ?? [];

        // A coluna "Membro" é injetada automaticamente (não passa pelo
        // formulário) — reaproveita a que já existir nesse campo para manter
        // os valores já registrados vinculados a ela.
        const membroExistente = colunasExistentes.find(
          (c) => c.tipo === "MEMBRO",
        );
        const precisaMembro =
          campoInput.repetivel && campoInput.identificarMembro && !temGoniometria;

        const colunasInput: (ColunaInput & { id?: string })[] = precisaMembro
          ? [
              {
                id: membroExistente?.id,
                titulo: "Membro",
                tipo: "MEMBRO" as ColunaInput["tipo"],
                formatacao: "",
                opcoes: OPCOES_MEMBRO,
                multiplaSelecao: false,
                valorIdeal: "",
                direcaoIdeal: undefined,
              },
              ...campoInput.colunas,
            ]
          : campoInput.colunas;

        const colunaIdsRecebidos = new Set(
          colunasInput.map((c) => c.id).filter(Boolean),
        );
        for (const colunaExistente of colunasExistentes) {
          if (!colunaIdsRecebidos.has(colunaExistente.id)) {
            await tx.exameCampoColuna.delete({
              where: { id: colunaExistente.id },
            });
          }
        }

        for (const [colunaIndex, colunaInput] of colunasInput.entries()) {
          const colunaExistente = colunasExistentes.find(
            (c) => c.id === colunaInput.id,
          );
          const colunaData = colunaUpdateData(colunaInput, colunaIndex);

          if (colunaExistente) {
            await tx.exameCampoColuna.update({
              where: { id: colunaExistente.id },
              data: colunaData,
            });
          } else {
            await tx.exameCampoColuna.create({
              data: { ...colunaData, campoId },
            });
          }
        }
      }
    }
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

  const emUso = (await prisma.exameExecucao.count({ where: { exameId: id } })) > 0;

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
