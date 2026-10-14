"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { exameExecucaoSchema } from "@/lib/validations/exame-execucao";
import { montarComparativo } from "@/lib/relatorio-comparativo";
import {
  acrescentarValoresCalculados,
  montarLinhasComparacaoRapida,
} from "@/lib/comparacao-rapida";
import { parseVariaveis } from "@/lib/exame-formula";
import { copyObject, deleteObject, deleteObjects, headObject } from "@/lib/r2";
import {
  chaveTmpDoPaciente,
  MAX_ARQUIVOS_POR_COLUNA,
  mimeEfetivo,
  montarChaveImagem,
  validarArquivo,
  type RemapLinha,
} from "@/lib/storage-keys";
import {
  parseImagensForm,
  type ImagemNova,
} from "@/lib/validations/exame-imagens";

export async function listAllExamesCompletos() {
  return prisma.exame.findMany({
    where: { versaoAtual: true },
    orderBy: { nome: "asc" },
    include: {
      secoes: {
        orderBy: { ordem: "asc" },
        include: {
          campos: {
            orderBy: { ordem: "asc" },
            include: { colunas: { orderBy: { ordem: "asc" } } },
          },
        },
      },
    },
  });
}

export async function getAvaliacoesByPaciente(pacienteId: string) {
  return prisma.exameExecucao.findMany({
    where: { pacienteId, tipo: "AVALIACAO" },
    orderBy: { data: "desc" },
    include: {
      exame: { select: { id: true, nome: true, tipo: true } },
      retornos: {
        orderBy: { data: "desc" },
        select: { id: true, data: true },
      },
    },
  });
}

export async function getExecucao(id: string) {
  return prisma.exameExecucao.findUnique({
    where: { id },
    include: {
      paciente: {
        select: { id: true, nome: true, sexo: true, idade: true },
      },
      exame: {
        include: {
          secoes: {
            orderBy: { ordem: "asc" },
            include: {
              campos: {
                orderBy: { ordem: "asc" },
                include: { colunas: { orderBy: { ordem: "asc" } } },
              },
            },
          },
        },
      },
      avaliacao: { select: { id: true, data: true } },
      retornos: {
        orderBy: { data: "desc" },
        select: { id: true, data: true },
      },
      valores: true,
    },
  });
}

/**
 * Execução mais recente do paciente para um exame (Avaliação ou Retorno,
 * o que for mais novo) — usada pra pré-preencher um novo Retorno de um
 * "Exame Sombra" com os valores anteriores.
 */
export async function getExecucaoAnteriorParaRetorno(
  pacienteId: string,
  exameId: string,
) {
  return prisma.exameExecucao.findFirst({
    where: { pacienteId, exameId },
    orderBy: { data: "desc" },
    include: { valores: true },
  });
}

export async function getComparativo(avaliacaoId: string, retornoId: string) {
  const [avaliacao, retorno, movimentos] = await Promise.all([
    prisma.exameExecucao.findUnique({
      where: { id: avaliacaoId },
      include: {
        paciente: {
          select: {
            id: true,
            nome: true,
            idade: true,
            dataNascimento: true,
            cpf: true,
            contato: true,
            endereco: true,
            objetivo: true,
            doencasPreexistentes: true,
            cirurgiasAnteriores: true,
            medicamentos: true,
            historicoClinico: true,
          },
        },
        exame: {
          include: {
            secoes: {
              orderBy: { ordem: "asc" },
              include: {
                campos: {
                  orderBy: { ordem: "asc" },
                  include: { colunas: { orderBy: { ordem: "asc" } } },
                },
              },
            },
          },
        },
        valores: true,
      },
    }),
    prisma.exameExecucao.findUnique({
      where: { id: retornoId },
      select: { id: true, data: true, avaliacaoId: true, valores: true },
    }),
    prisma.movimento.findMany({ select: { nome: true, grauIdeal: true } }),
  ]);

  if (
    !avaliacao ||
    avaliacao.tipo !== "AVALIACAO" ||
    !retorno ||
    retorno.avaliacaoId !== avaliacaoId
  ) {
    return null;
  }

  const secoes = montarComparativo(
    avaliacao.exame,
    avaliacao.valores,
    retorno.valores,
    movimentos,
  );

  return {
    paciente: avaliacao.paciente,
    exame: {
      id: avaliacao.exame.id,
      nome: avaliacao.exame.nome,
      tipo: avaliacao.exame.tipo,
    },
    avaliacaoData: avaliacao.data,
    retornoData: retorno.data,
    secoes,
  };
}

export async function getComparacaoRapida(
  avaliacaoId: string,
  execucaoIds: string[],
) {
  const avaliacao = await prisma.exameExecucao.findUnique({
    where: { id: avaliacaoId },
    include: {
      paciente: { select: { id: true, nome: true, sexo: true, idade: true } },
      exame: {
        include: {
          secoes: {
            orderBy: { ordem: "asc" },
            include: {
              campos: {
                orderBy: { ordem: "asc" },
                include: { colunas: { orderBy: { ordem: "asc" } } },
              },
            },
          },
        },
      },
      valores: true,
    },
  });

  if (!avaliacao || avaliacao.tipo !== "AVALIACAO") return null;

  const idsUnicos = Array.from(new Set(execucaoIds));

  const retornos = await prisma.exameExecucao.findMany({
    where: { id: { in: idsUnicos }, avaliacaoId },
    include: { valores: true },
  });

  if (retornos.length !== idsUnicos.length) return null;

  const execucoes = acrescentarValoresCalculados(
    avaliacao.exame,
    [
      { id: avaliacao.id, tipo: avaliacao.tipo, data: avaliacao.data, valores: avaliacao.valores },
      ...retornos.map((r) => ({ id: r.id, tipo: r.tipo, data: r.data, valores: r.valores })),
    ].sort((a, b) => a.data.getTime() - b.data.getTime()),
    { sexo: avaliacao.paciente.sexo, idade: avaliacao.paciente.idade },
    parseVariaveis(avaliacao.exame.variaveis),
  );

  const secoes = montarLinhasComparacaoRapida(avaliacao.exame, execucoes);

  return {
    paciente: avaliacao.paciente,
    exame: { id: avaliacao.exame.id, nome: avaliacao.exame.nome },
    execucoes: execucoes.map((e) => ({ id: e.id, tipo: e.tipo, data: e.data })),
    secoes,
  };
}

export type ExameExecucaoActionState = {
  error?: string;
  success?: boolean;
  execucaoId?: string;
  /** Quantas imagens não puderam ser vinculadas (a execução foi salva mesmo assim). */
  imagensFalhas?: number;
};

function parseExecucaoForm(formData: FormData) {
  const exameId = formData.get("exameId");
  const valoresRaw = formData.get("valores");

  let valores: unknown = [];

  try {
    valores = valoresRaw ? JSON.parse(String(valoresRaw)) : [];
  } catch {
    return null;
  }

  return exameExecucaoSchema.safeParse({ exameId, valores });
}

/** Mapa de reindexação das linhas repetíveis, enviado pelo form de edição. */
function parseRemapImagens(formData: FormData) {
  try {
    const raw = formData.get("remapImagens");
    if (!raw) return null;
    const json = JSON.parse(String(raw)) as {
      colunas?: unknown;
      remap?: unknown;
    };
    const colunas = Array.isArray(json.colunas)
      ? json.colunas.filter((c): c is string => typeof c === "string")
      : [];
    const remap = Array.isArray(json.remap)
      ? json.remap.filter(
          (r): r is RemapLinha =>
            typeof r?.colunaId === "string" &&
            Number.isInteger(r.de) &&
            Number.isInteger(r.para),
        )
      : [];
    return { colunas, remap };
  } catch {
    return null;
  }
}

/** Remove do R2 (best-effort) os objetos cujas chaves foram apagadas do banco. */
async function apagarObjetosR2(chaves: string[]) {
  if (chaves.length === 0) return;
  try {
    await deleteObjects(chaves);
  } catch (e) {
    console.error("Falha ao apagar imagens do R2", e);
  }
}

/**
 * Vincula à execução as imagens já enviadas à área temporária: confere o
 * objeto no R2, copia para a chave definitiva e grava o registro. Devolve
 * quantas falharam — o exame em si já está salvo.
 */
async function vincularImagens(
  execucaoId: string,
  pacienteId: string,
  imagens: ImagemNova[],
) {
  if (imagens.length === 0) return 0;

  const colunasValidas = new Set(
    (
      await prisma.exameCampoColuna.findMany({
        where: {
          id: { in: [...new Set(imagens.map((i) => i.colunaId))] },
          permiteAnexo: true,
        },
        select: { id: true },
      })
    ).map((c) => c.id),
  );
  const contagem = new Map<string, number>();
  const existentes = await prisma.exameExecucaoImagem.groupBy({
    by: ["colunaId", "linha"],
    where: { execucaoId },
    _count: true,
  });
  for (const e of existentes) {
    contagem.set(`${e.colunaId}::${e.linha}`, e._count);
  }

  let falhas = 0;
  for (const imagem of imagens) {
    const chaveContagem = `${imagem.colunaId}::${imagem.linha}`;
    try {
      if (
        !chaveTmpDoPaciente(imagem.chave, pacienteId) ||
        !colunasValidas.has(imagem.colunaId)
      ) {
        throw new Error("Imagem inválida.");
      }
      const meta = await headObject(imagem.chave);
      if (
        validarArquivo(imagem.nomeOriginal, meta.tamanho) ||
        (contagem.get(chaveContagem) ?? 0) >= MAX_ARQUIVOS_POR_COLUNA
      ) {
        await deleteObject(imagem.chave);
        throw new Error("Imagem recusada.");
      }
      const chaveFinal = montarChaveImagem({
        pacienteId,
        execucaoId,
        colunaId: imagem.colunaId,
        linha: imagem.linha,
        uuid: randomUUID(),
        nome: imagem.nomeOriginal,
      });
      await copyObject(imagem.chave, chaveFinal);
      await prisma.exameExecucaoImagem.create({
        data: {
          execucaoId,
          colunaId: imagem.colunaId,
          linha: imagem.linha,
          chave: chaveFinal,
          nomeOriginal: imagem.nomeOriginal,
          mime: mimeEfetivo(meta.mime),
          tamanho: meta.tamanho,
        },
      });
      contagem.set(chaveContagem, (contagem.get(chaveContagem) ?? 0) + 1);
      await deleteObject(imagem.chave).catch(() => {});
    } catch (e) {
      console.error("Falha ao vincular imagem", e);
      falhas++;
    }
  }
  return falhas;
}

export async function createAvaliacao(
  pacienteId: string,
  _prevState: ExameExecucaoActionState,
  formData: FormData,
): Promise<ExameExecucaoActionState> {
  const parsed = parseExecucaoForm(formData);

  if (!parsed || !parsed.success) {
    return { error: parsed?.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const execucao = await prisma.exameExecucao.create({
    data: {
      tipo: "AVALIACAO",
      pacienteId,
      exameId: parsed.data.exameId,
      valores: {
        createMany: {
          data: parsed.data.valores.map((v) => ({
            colunaId: v.colunaId,
            valor: v.valor,
            linha: v.linha,
          })),
        },
      },
    },
  });

  const imagensFalhas = await vincularImagens(
    execucao.id,
    pacienteId,
    parseImagensForm(formData).imagens,
  );

  revalidatePath(`/pacientes/${pacienteId}`);
  return { success: true, execucaoId: execucao.id, imagensFalhas };
}

export async function createRetorno(
  pacienteId: string,
  avaliacaoId: string,
  _prevState: ExameExecucaoActionState,
  formData: FormData,
): Promise<ExameExecucaoActionState> {
  const parsed = parseExecucaoForm(formData);

  if (!parsed || !parsed.success) {
    return { error: parsed?.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const avaliacao = await prisma.exameExecucao.findUnique({
    where: { id: avaliacaoId },
    select: { exameId: true, pacienteId: true },
  });

  if (!avaliacao || avaliacao.pacienteId !== pacienteId) {
    return { error: "Avaliação não encontrada." };
  }

  const execucao = await prisma.exameExecucao.create({
    data: {
      tipo: "RETORNO",
      pacienteId,
      exameId: avaliacao.exameId,
      avaliacaoId,
      valores: {
        createMany: {
          data: parsed.data.valores.map((v) => ({
            colunaId: v.colunaId,
            valor: v.valor,
            linha: v.linha,
          })),
        },
      },
    },
  });

  const imagensFalhas = await vincularImagens(
    execucao.id,
    pacienteId,
    parseImagensForm(formData).imagens,
  );

  revalidatePath(`/pacientes/${pacienteId}`);
  return { success: true, execucaoId: execucao.id, imagensFalhas };
}

export async function updateExecucao(
  execucaoId: string,
  pacienteId: string,
  _prevState: ExameExecucaoActionState,
  formData: FormData,
): Promise<ExameExecucaoActionState> {
  const parsed = parseExecucaoForm(formData);

  if (!parsed || !parsed.success) {
    return { error: parsed?.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const execucao = await prisma.exameExecucao.findUnique({
    where: { id: execucaoId },
    select: { pacienteId: true },
  });

  if (!execucao || execucao.pacienteId !== pacienteId) {
    return { error: "Registro não encontrado." };
  }

  const remapImagens = parseRemapImagens(formData);
  const chavesRemovidas: string[] = [];
  if (remapImagens) {
    const imagens = await prisma.exameExecucaoImagem.findMany({
      where: { execucaoId, colunaId: { in: remapImagens.colunas } },
      select: { id: true, colunaId: true, linha: true, chave: true },
    });
    const mantidas = new Set(
      remapImagens.remap.map((r) => `${r.colunaId}::${r.de}`),
    );
    const apagar = imagens.filter(
      (i) => !mantidas.has(`${i.colunaId}::${i.linha}`),
    );
    if (apagar.length > 0) {
      await prisma.exameExecucaoImagem.deleteMany({
        where: { id: { in: apagar.map((i) => i.id) } },
      });
      chavesRemovidas.push(...apagar.map((i) => i.chave));
    }
    // `remap` vem em ordem ascendente de `de` e preserva a ordem das linhas,
    // então mover sequencialmente nunca sobrescreve uma linha ainda não movida.
    for (const r of remapImagens.remap) {
      if (r.de === r.para) continue;
      await prisma.exameExecucaoImagem.updateMany({
        where: { execucaoId, colunaId: r.colunaId, linha: r.de },
        data: { linha: r.para },
      });
    }
    await apagarObjetosR2(chavesRemovidas);
  }

  await prisma.$transaction([
    prisma.exameExecucaoValor.deleteMany({ where: { execucaoId } }),
    prisma.exameExecucao.update({
      where: { id: execucaoId },
      data: {
        valores: {
          createMany: {
            data: parsed.data.valores.map((v) => ({
              colunaId: v.colunaId,
              valor: v.valor,
              linha: v.linha,
            })),
          },
        },
      },
    }),
  ]);

  const { imagens, removidas } = parseImagensForm(formData);
  if (removidas.length > 0) {
    const alvo = await prisma.exameExecucaoImagem.findMany({
      where: { execucaoId, id: { in: removidas } },
      select: { id: true, chave: true },
    });
    if (alvo.length > 0) {
      await prisma.exameExecucaoImagem.deleteMany({
        where: { id: { in: alvo.map((i) => i.id) } },
      });
      await apagarObjetosR2(alvo.map((i) => i.chave));
    }
  }
  const imagensFalhas = await vincularImagens(execucaoId, pacienteId, imagens);

  revalidatePath(`/pacientes/${pacienteId}`);
  revalidatePath(`/pacientes/${pacienteId}/exames/${execucaoId}`);
  return { success: true, execucaoId, imagensFalhas };
}

export async function deleteExecucao(id: string, pacienteId: string) {
  // Apagar uma avaliação apaga seus retornos em cascata (e as imagens deles).
  const imagens = await prisma.exameExecucaoImagem.findMany({
    where: { execucao: { OR: [{ id }, { avaliacaoId: id }] } },
    select: { chave: true },
  });
  await prisma.exameExecucao.delete({ where: { id } });
  await apagarObjetosR2(imagens.map((i) => i.chave));
  revalidatePath(`/pacientes/${pacienteId}`);
}
