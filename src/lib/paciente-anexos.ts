import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/prisma";
import {
  copyObject,
  deleteObject,
  headObject,
  presignGet,
  presignPut,
} from "@/lib/r2";
import {
  chaveTmpDoPaciente,
  MAX_ANEXOS_PACIENTE,
  mimeEfetivo,
  montarChaveAnexoPaciente,
  montarChaveTmp,
  tipoPreview,
  validarArquivo,
} from "@/lib/storage-keys";
import type { OrigemAnexo } from "@/generated/prisma/client";

/**
 * Regras compartilhadas dos anexos do paciente (histórico clínico). Usadas
 * pelas actions da clínica (com sessão) e do portal (validadas por token) —
 * quem chama é responsável por autenticar/autorizar e informar o `pacienteId`.
 */

export type AnexoPacienteItem = {
  id: string;
  nomeOriginal: string;
  mime: string;
  tamanho: number;
  createdAt: Date;
  origem: OrigemAnexo;
  url: string;
};

type Erro = { error: string };

/** Valida e devolve a URL assinada para o navegador enviar à área temporária. */
export async function criarTicketUpload(
  pacienteId: string,
  input: { nome: string; mime: string; tamanho: number },
): Promise<Erro | { chave: string; url: string }> {
  const erro = validarArquivo(input.nome, input.tamanho);
  if (erro) return { error: erro };

  const paciente = await prisma.paciente.findUnique({
    where: { id: pacienteId },
    select: { id: true },
  });
  if (!paciente) return { error: "Paciente não encontrado." };

  const total = await prisma.pacienteAnexo.count({ where: { pacienteId } });
  if (total >= MAX_ANEXOS_PACIENTE) {
    return { error: `Limite de ${MAX_ANEXOS_PACIENTE} anexos atingido.` };
  }

  const chave = montarChaveTmp({
    pacienteId,
    uuid: randomUUID(),
    nome: input.nome,
  });
  try {
    return {
      chave,
      url: await presignPut(chave, mimeEfetivo(input.mime), {
        tamanho: input.tamanho,
      }),
    };
  } catch (e) {
    console.error("Falha ao assinar upload de anexo", e);
    return { error: "Envio de arquivos indisponível no momento." };
  }
}

/** Confere o objeto no R2, move para `pacientes/{id}/anexos/` e grava o registro. */
export async function registrarAnexo(input: {
  pacienteId: string;
  chave: string;
  nomeOriginal: string;
  origem: OrigemAnexo;
}): Promise<Erro | { success: true }> {
  if (!chaveTmpDoPaciente(input.chave, input.pacienteId)) {
    return { error: "Arquivo inválido." };
  }
  try {
    const meta = await headObject(input.chave);
    const erro = validarArquivo(input.nomeOriginal, meta.tamanho);
    const total = await prisma.pacienteAnexo.count({
      where: { pacienteId: input.pacienteId },
    });
    if (erro || total >= MAX_ANEXOS_PACIENTE) {
      await deleteObject(input.chave).catch(() => {});
      return { error: erro ?? `Limite de ${MAX_ANEXOS_PACIENTE} anexos atingido.` };
    }
    const chaveFinal = montarChaveAnexoPaciente({
      pacienteId: input.pacienteId,
      uuid: randomUUID(),
      nome: input.nomeOriginal,
    });
    await copyObject(input.chave, chaveFinal);
    await prisma.pacienteAnexo.create({
      data: {
        pacienteId: input.pacienteId,
        chave: chaveFinal,
        nomeOriginal: input.nomeOriginal.slice(0, 200),
        mime: mimeEfetivo(meta.mime),
        tamanho: meta.tamanho,
        origem: input.origem,
      },
    });
    await deleteObject(input.chave).catch(() => {});
    return { success: true };
  } catch (e) {
    console.error("Falha ao registrar anexo do paciente", e);
    return { error: "Não foi possível salvar o anexo." };
  }
}

/** Apaga o registro e o objeto do R2. */
export async function excluirAnexo(anexo: { id: string; chave: string }) {
  await prisma.pacienteAnexo.delete({ where: { id: anexo.id } });
  await deleteObject(anexo.chave).catch((e) =>
    console.error("Falha ao apagar anexo do R2", e),
  );
}

/** Anexos com URLs assinadas (imagem/PDF/vídeo/áudio abrem inline; o resto baixa). */
export async function listarAnexosComUrls(
  pacienteId: string,
  filtro: { origem?: OrigemAnexo } = {},
): Promise<AnexoPacienteItem[]> {
  const anexos = await prisma.pacienteAnexo.findMany({
    where: { pacienteId, ...filtro },
    orderBy: { createdAt: "desc" },
  });
  return Promise.all(
    anexos.map(async (a) => ({
      id: a.id,
      nomeOriginal: a.nomeOriginal,
      mime: a.mime,
      tamanho: a.tamanho,
      createdAt: a.createdAt,
      origem: a.origem,
      url: await presignGet(a.chave, {
        nome: a.nomeOriginal,
        inline: tipoPreview(a.mime) !== null,
      }).catch(() => ""),
    })),
  );
}
