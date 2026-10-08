"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  copyObject,
  deleteObject,
  deleteObjects,
  headObject,
  presignGet,
  presignPut,
} from "@/lib/r2";
import {
  chaveTmpPreCadastroValida,
  mimeEfetivo,
  montarChaveArquivoPreCadastro,
  montarChaveTmpPreCadastro,
  sessaoUploadValida,
  tipoPreview,
  validarArquivo,
} from "@/lib/storage-keys";
import {
  parseArquivosPreCadastro,
  preCadastroSchema,
  rejeitarPreCadastroSchema,
  solicitarUploadPreCadastroSchema,
} from "@/lib/validations/pre-cadastro";
import type { StatusPreCadastro } from "@/generated/prisma/client";

const PAGE_SIZE = 10;

export type PreCadastroActionState = {
  error?: string;
  success?: boolean;
};

/**
 * Ação pública (sem login): URL assinada para o navegador enviar um anexo à
 * área temporária `tmp/pre-cadastro/{sessao}/`. Limites: 15 MB (assinado no
 * Content-Length), sem executáveis, URL válida por 5 min; o que não for
 * vinculado a um pré-cadastro expira sozinho em 1 dia (regra do bucket).
 */
export async function solicitarUploadPreCadastro(input: {
  sessaoId: string;
  nome: string;
  mime: string;
  tamanho: number;
}): Promise<{ error: string } | { chave: string; url: string }> {
  const parsed = solicitarUploadPreCadastroSchema.safeParse(input);
  if (!parsed.success || !sessaoUploadValida(parsed.data.sessaoId)) {
    return { error: "Envio inválido." };
  }
  const { sessaoId, nome, mime, tamanho } = parsed.data;

  const erro = validarArquivo(nome, tamanho);
  if (erro) return { error: erro };

  const chave = montarChaveTmpPreCadastro({
    sessaoId,
    uuid: randomUUID(),
    nome,
  });
  try {
    return {
      chave,
      url: await presignPut(chave, mimeEfetivo(mime), { tamanho }),
    };
  } catch (e) {
    console.error("Falha ao assinar upload de pré-cadastro", e);
    return { error: "Envio de arquivos indisponível no momento." };
  }
}

/**
 * Confere cada anexo no R2 (tamanho real), copia da área temporária para
 * `pre-cadastro/{id}/` e grava o registro. Falhas não desfazem o pré-cadastro.
 */
async function vincularArquivosPreCadastro(
  preCadastroId: string,
  sessaoId: string,
  arquivos: { chave: string; nomeOriginal: string }[],
) {
  for (const arquivo of arquivos) {
    try {
      if (!chaveTmpPreCadastroValida(arquivo.chave, sessaoId)) {
        throw new Error("Chave inválida.");
      }
      const meta = await headObject(arquivo.chave);
      if (validarArquivo(arquivo.nomeOriginal, meta.tamanho)) {
        await deleteObject(arquivo.chave);
        throw new Error("Arquivo recusado.");
      }
      const chaveFinal = montarChaveArquivoPreCadastro({
        preCadastroId,
        uuid: randomUUID(),
        nome: arquivo.nomeOriginal,
      });
      await copyObject(arquivo.chave, chaveFinal);
      await prisma.preCadastroArquivo.create({
        data: {
          preCadastroId,
          chave: chaveFinal,
          nomeOriginal: arquivo.nomeOriginal,
          mime: mimeEfetivo(meta.mime),
          tamanho: meta.tamanho,
        },
      });
      await deleteObject(arquivo.chave).catch(() => {});
    } catch (e) {
      console.error("Falha ao vincular arquivo de pré-cadastro", e);
    }
  }
}

/** Ação pública (sem login): grava o envio do formulário em /pre-cadastro. */
export async function criarPreCadastro(
  _prevState: PreCadastroActionState,
  formData: FormData,
): Promise<PreCadastroActionState> {
  const parsed = preCadastroSchema.safeParse({
    nome: formData.get("nome"),
    sobrenome: formData.get("sobrenome"),
    celular: formData.get("celular"),
    queixaPrincipal: formData.get("queixaPrincipal"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const criado = await prisma.preCadastro.create({ data: parsed.data });

  const sessaoId = String(formData.get("sessaoUpload") ?? "");
  const arquivos = parseArquivosPreCadastro(formData.get("arquivos"));
  if (arquivos.length > 0 && sessaoUploadValida(sessaoId)) {
    await vincularArquivosPreCadastro(criado.id, sessaoId, arquivos);
  }

  revalidatePath("/curadoria");
  return { success: true };
}

async function exigirSessao() {
  const session = await auth();
  if (!session?.user) throw new Error("Não autenticado.");
}

export async function listPreCadastros(
  filters: { status: StatusPreCadastro; q?: string },
  page: number,
) {
  const where = {
    status: filters.status,
    ...(filters.q
      ? {
          OR: [
            { nome: { contains: filters.q, mode: "insensitive" as const } },
            { sobrenome: { contains: filters.q, mode: "insensitive" as const } },
            { celular: { contains: filters.q.replace(/\D/g, "") || "__", } },
          ],
        }
      : {}),
  };

  // Pendentes: ordem de chegada (mais antigo primeiro). Histórico: mais recente primeiro.
  const orderBy =
    filters.status === "PENDENTE"
      ? { createdAt: "asc" as const }
      : { analisadoEm: "desc" as const };

  const [itens, total] = await Promise.all([
    prisma.preCadastro.findMany({
      where,
      orderBy,
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: { arquivos: { orderBy: { createdAt: "asc" } } },
    }),
    prisma.preCadastro.count({ where }),
  ]);

  // URLs de leitura assinadas (curta duração); imagens abrem inline, o resto baixa.
  const itensComArquivos = await Promise.all(
    itens.map(async (item) => ({
      ...item,
      arquivos: await Promise.all(
        item.arquivos.map(async (a) => ({
          id: a.id,
          nomeOriginal: a.nomeOriginal,
          mime: a.mime,
          tamanho: a.tamanho,
          url: await presignGet(a.chave, {
            nome: a.nomeOriginal,
            inline: tipoPreview(a.mime) !== null,
          }).catch(() => ""),
        })),
      ),
    })),
  );

  return {
    itens: itensComArquivos,
    total,
    totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
    page,
  };
}

export async function contarPreCadastrosPorStatus() {
  const grupos = await prisma.preCadastro.groupBy({
    by: ["status"],
    _count: { _all: true },
  });
  const contagem: Record<StatusPreCadastro, number> = {
    PENDENTE: 0,
    APROVADO: 0,
    REJEITADO: 0,
  };
  for (const g of grupos) contagem[g.status] = g._count._all;
  return contagem;
}

export async function buscarPreCadastroPendente(id: string) {
  return prisma.preCadastro.findFirst({ where: { id, status: "PENDENTE" } });
}

export async function rejeitarPreCadastro(
  id: string,
  _prevState: PreCadastroActionState,
  formData: FormData,
): Promise<PreCadastroActionState> {
  await exigirSessao();

  const parsed = rejeitarPreCadastroSchema.safeParse({
    motivo: formData.get("motivo") || undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const { count } = await prisma.preCadastro.updateMany({
    where: { id, status: "PENDENTE" },
    data: {
      status: "REJEITADO",
      motivoRejeicao: parsed.data.motivo || null,
      analisadoEm: new Date(),
    },
  });
  if (count === 0) return { error: "Este pré-cadastro já foi analisado." };

  // Rejeitado: os anexos não são mais necessários (privacidade) — apaga do R2.
  const anexos = await prisma.preCadastroArquivo.findMany({
    where: { preCadastroId: id },
    select: { id: true, chave: true },
  });
  if (anexos.length > 0) {
    await prisma.preCadastroArquivo.deleteMany({
      where: { id: { in: anexos.map((a) => a.id) } },
    });
    try {
      await deleteObjects(anexos.map((a) => a.chave));
    } catch (e) {
      console.error("Falha ao apagar anexos de pré-cadastro rejeitado", e);
    }
  }

  revalidatePath("/curadoria");
  return { success: true };
}
