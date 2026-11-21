"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { exigirSessao } from "@/lib/sessao";
import { PACIENTE_ATIVO } from "@/lib/paciente-exclusao";
import { tipoDocumento } from "@/lib/documentos-catalogo";
import { lerValoresDoFormData, validarValoresDocumento } from "@/lib/documentos-valores";
import { listarDocumentosDoPaciente } from "@/lib/documentos-paciente";

export type DocumentoActionState = { error?: string; success?: boolean; id?: string };

export async function listarDocumentosPaciente(pacienteId: string) {
  await exigirSessao();
  return listarDocumentosDoPaciente(pacienteId);
}

async function exigirPacienteAtivo(pacienteId: string) {
  const paciente = await prisma.paciente.findFirst({
    where: { id: pacienteId, ...PACIENTE_ATIVO },
    select: { id: true },
  });
  return !!paciente;
}

export async function criarDocumento(
  pacienteId: string,
  tipoSlug: string,
  _prev: DocumentoActionState,
  formData: FormData,
): Promise<DocumentoActionState> {
  const usuario = await exigirSessao();
  const tipo = tipoDocumento(tipoSlug);
  if (!tipo) return { error: "Tipo de documento inválido." };
  if (!(await exigirPacienteAtivo(pacienteId))) return { error: "Paciente não encontrado." };

  const r = validarValoresDocumento(tipo, lerValoresDoFormData(tipo, formData));
  if (!r.ok) return { error: r.erro };

  // Congela a assinatura atual do autor (tipos sem caixa — modelo já assinado — não guardam).
  const assinaturaId =
    tipo.assinaturas.length > 0
      ? ((
          await prisma.user.findUnique({
            where: { id: usuario.id },
            select: { assinaturaAtualId: true },
          })
        )?.assinaturaAtualId ?? null)
      : null;

  const doc = await prisma.documentoPaciente.create({
    data: { pacienteId, tipo: tipo.slug, valores: r.valores, autorId: usuario.id, assinaturaId },
    select: { id: true },
  });
  revalidatePath(`/pacientes/${pacienteId}`);
  return { success: true, id: doc.id };
}

export async function atualizarDocumento(
  id: string,
  _prev: DocumentoActionState,
  formData: FormData,
): Promise<DocumentoActionState> {
  await exigirSessao();
  const doc = await prisma.documentoPaciente.findUnique({
    where: { id },
    select: { pacienteId: true, tipo: true },
  });
  const tipo = doc && tipoDocumento(doc.tipo);
  if (!doc || !tipo) return { error: "Documento não encontrado." };
  if (!(await exigirPacienteAtivo(doc.pacienteId))) return { error: "Paciente não encontrado." };

  const r = validarValoresDocumento(tipo, lerValoresDoFormData(tipo, formData));
  if (!r.ok) return { error: r.erro };

  await prisma.documentoPaciente.update({ where: { id }, data: { valores: r.valores } });
  revalidatePath(`/pacientes/${doc.pacienteId}`);
  return { success: true, id };
}

export async function excluirDocumento(id: string) {
  await exigirSessao();
  const doc = await prisma.documentoPaciente.delete({ where: { id }, select: { pacienteId: true } });
  revalidatePath(`/pacientes/${doc.pacienteId}`);
}
