"use server";

import { randomUUID } from "node:crypto";
import { Prisma } from "@/generated/prisma/client";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { anotacoesSchema, lerAnotacoes, type Anotacoes } from "@/lib/anotacoes-imagem";
import { deleteObject, presignGet, presignPut } from "@/lib/r2";
import {
  chaveTmpDoPaciente,
  ehImagem,
  mimeEfetivo,
  montarChaveTmp,
  validarArquivo,
} from "@/lib/storage-keys";
import { exigirSessao } from "@/lib/sessao";

export type ImagemExame = {
  id: string;
  colunaId: string;
  linha: number;
  nomeOriginal: string;
  mime: string;
  url: string;
};

/** Imagens da execução com URLs de leitura assinadas (curta duração). */
export async function listarImagensExecucao(
  execucaoId: string,
): Promise<ImagemExame[]> {
  await exigirSessao();
  const imagens = await prisma.exameExecucaoImagem.findMany({
    where: { execucaoId },
    orderBy: { createdAt: "asc" },
  });
  try {
    return await Promise.all(
      imagens.map(async (i) => ({
        id: i.id,
        colunaId: i.colunaId,
        linha: i.linha,
        nomeOriginal: i.nomeOriginal,
        mime: i.mime,
        url: await presignGet(i.chave, {
          nome: i.nomeOriginal,
          inline: ehImagem(i.mime),
        }),
      })),
    );
  } catch (e) {
    // Sem R2 configurado a tela de exame continua funcionando, só sem imagens.
    console.error("Falha ao assinar URLs de imagens", e);
    return [];
  }
}

/**
 * Chamado assim que a pessoa escolhe o arquivo: devolve a URL assinada para o
 * navegador enviar direto à área temporária (`tmp/`). O vínculo com a
 * execução só acontece ao salvar o exame.
 */
export async function solicitarUploadImagem(input: {
  pacienteId: string;
  nome: string;
  mime: string;
  tamanho: number;
}): Promise<{ error: string } | { chave: string; url: string }> {
  await exigirSessao();

  const erro = validarArquivo(input.nome, input.tamanho);
  if (erro) return { error: erro };

  const paciente = await prisma.paciente.findUnique({
    where: { id: input.pacienteId },
    select: { id: true },
  });
  if (!paciente) return { error: "Paciente não encontrado." };

  const chave = montarChaveTmp({
    pacienteId: input.pacienteId,
    uuid: randomUUID(),
    nome: input.nome,
  });
  return { chave, url: await presignPut(chave, mimeEfetivo(input.mime), {
    tamanho: input.tamanho,
  }) };
}

/** Remove um upload temporário (a pessoa tirou a imagem antes de salvar). */
export async function descartarUploadTemporario(input: {
  pacienteId: string;
  chave: string;
}): Promise<void> {
  await exigirSessao();
  if (!chaveTmpDoPaciente(input.chave, input.pacienteId)) return;
  try {
    await deleteObject(input.chave);
  } catch (e) {
    // A regra de expiração de tmp/ limpa o que sobrar.
    console.error("Falha ao descartar upload temporário", e);
  }
}

export type ImagemSerie = {
  id: string;
  url: string;
  nomeOriginal: string;
  /** Coluna do exame onde a imagem foi anexada (ex.: "Vista anterior"). */
  rotulo: string;
  tipo: "AVALIACAO" | "RETORNO";
  data: Date;
  /** Desenhos salvos sobre a imagem (null = sem anotações). */
  anotacoes: Anotacoes | null;
};

export type SerieImagens = {
  /** Id da avaliação que abre a série (retornos entram na série dela). */
  id: string;
  exameNome: string;
  avaliacaoData: Date;
  imagens: ImagemSerie[];
};

/**
 * Imagens do paciente agrupadas por exame realizado: cada avaliação e seus
 * retornos formam uma série, para comparar a evolução entre as datas.
 */
export async function listarSeriesImagensPaciente(
  pacienteId: string,
): Promise<SerieImagens[]> {
  await exigirSessao();

  const imagens = await prisma.exameExecucaoImagem.findMany({
    where: { execucao: { pacienteId }, mime: { startsWith: "image/" } },
    include: {
      execucao: {
        select: {
          id: true,
          tipo: true,
          data: true,
          avaliacaoId: true,
          exame: { select: { nome: true } },
        },
      },
    },
    orderBy: { createdAt: "asc" },
  });
  const imagensRaster = imagens.filter((i) => ehImagem(i.mime));
  if (imagensRaster.length === 0) return [];

  const colunas = await prisma.exameCampoColuna.findMany({
    where: { id: { in: [...new Set(imagensRaster.map((i) => i.colunaId))] } },
    select: { id: true, titulo: true, campo: { select: { nome: true } } },
  });
  const rotulos = new Map(
    colunas.map((c) => [
      c.id,
      [c.campo.nome, c.titulo].filter(Boolean).join(" — "),
    ]),
  );

  const avaliacaoIds = [
    ...new Set(imagensRaster.map((i) => i.execucao.avaliacaoId ?? i.execucao.id)),
  ];
  const avaliacoes = await prisma.exameExecucao.findMany({
    where: { id: { in: avaliacaoIds } },
    select: { id: true, data: true, exame: { select: { nome: true } } },
  });

  let urls: string[];
  try {
    urls = await Promise.all(
      imagensRaster.map((i) =>
        presignGet(i.chave, { nome: i.nomeOriginal, inline: true }),
      ),
    );
  } catch (e) {
    console.error("Falha ao assinar URLs das séries de imagens", e);
    return [];
  }

  const series = avaliacoes.map<SerieImagens>((a) => ({
    id: a.id,
    exameNome: a.exame.nome,
    avaliacaoData: a.data,
    imagens: [],
  }));
  const porId = new Map(series.map((s) => [s.id, s]));
  imagensRaster.forEach((i, idx) => {
    porId.get(i.execucao.avaliacaoId ?? i.execucao.id)?.imagens.push({
      id: i.id,
      url: urls[idx],
      nomeOriginal: i.nomeOriginal,
      rotulo: rotulos.get(i.colunaId) ?? "Imagem",
      tipo: i.execucao.tipo,
      data: i.execucao.data,
      anotacoes: lerAnotacoes(i.anotacoes),
    });
  });
  for (const s of series) {
    s.imagens.sort((a, b) => a.data.getTime() - b.data.getTime());
  }
  return series
    .filter((s) => s.imagens.length > 0)
    .sort((a, b) => b.avaliacaoData.getTime() - a.avaliacaoData.getTime());
}

/** Salva (ou limpa, com `null`) as anotações desenhadas sobre uma imagem. */
export async function salvarAnotacoesImagem(
  imagemId: string,
  anotacoes: Anotacoes | null,
): Promise<{ error: string } | { ok: true }> {
  await exigirSessao();

  let valor: Anotacoes | null = null;
  if (anotacoes && anotacoes.formas.length > 0) {
    const r = anotacoesSchema.safeParse(anotacoes);
    if (!r.success) return { error: "Anotações inválidas." };
    valor = r.data;
  }

  const imagem = await prisma.exameExecucaoImagem.findUnique({
    where: { id: imagemId },
    select: { execucao: { select: { pacienteId: true } } },
  });
  if (!imagem) return { error: "Imagem não encontrada." };

  await prisma.exameExecucaoImagem.update({
    where: { id: imagemId },
    // Json? aceita null apenas via Prisma.DbNull
    data: { anotacoes: valor ?? Prisma.DbNull },
  });
  revalidatePath(`/pacientes/${imagem.execucao.pacienteId}`);
  return { ok: true };
}
