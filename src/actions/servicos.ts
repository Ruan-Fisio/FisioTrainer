"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { servicoSchema } from "@/lib/validations/servico";

const PAGE_SIZE = 10;

export async function listServicos(filters: { q?: string }, page: number) {
  const where = filters.q
    ? { nome: { contains: filters.q, mode: "insensitive" as const } }
    : {};

  const [servicos, total] = await Promise.all([
    prisma.servico.findMany({
      where,
      orderBy: { nome: "asc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: {
        _count: { select: { agendamentos: true } },
        salas: { select: { salaId: true } },
        profissionais: { select: { usuarioId: true } },
      },
    }),
    prisma.servico.count({ where }),
  ]);

  return {
    servicos,
    total,
    totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
    page,
  };
}

/** Só serviços ativos, para popular selects (ex. agendamento manual de serviço). */
export async function listAllServicos() {
  const servicos = await prisma.servico.findMany({
    where: { ativo: true },
    orderBy: { nome: "asc" },
    select: {
      id: true,
      nome: true,
      valorPadrao: true,
      taxaProfissionalPercentual: true,
    },
  });
  return servicos.map((s) => ({
    ...s,
    valorPadrao: Number(s.valorPadrao),
    taxaProfissionalPercentual: Number(s.taxaProfissionalPercentual),
  }));
}

/**
 * Profissionais que podem ser escolhidos ao agendar este serviço: os habilitados
 * (`UsuarioServico`), ou todos os usuários quando o serviço não restringe nenhum
 * (mesma regra de `validarProfissionalServico` em `agendamento-checagens.ts`).
 */
export async function getProfissionaisServico(servicoId: string) {
  const [habilitados, todos] = await Promise.all([
    prisma.usuarioServico.findMany({
      where: { servicoId },
      select: { usuario: { select: { id: true, name: true } } },
      orderBy: { usuario: { name: "asc" } },
    }),
    prisma.user.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);
  return habilitados.length > 0 ? habilitados.map((h) => h.usuario) : todos;
}

export async function getServico(id: string) {
  return prisma.servico.findUnique({
    where: { id },
    include: {
      salas: { select: { salaId: true, capacidade: true, descricao: true } },
      profissionais: { select: { usuarioId: true } },
    },
  });
}

export type ServicoActionState = {
  error?: string;
  success?: boolean;
};

function parseForm(formData: FormData) {
  return servicoSchema.safeParse({
    nome: formData.get("nome"),
    ativo: formData.get("ativo") === "on",
    valorPadrao: formData.get("valorPadrao"),
    taxaProfissionalPercentual: formData.get("taxaProfissionalPercentual"),
    salas: formData.get("salas") ?? "[]",
    profissionais: formData.get("profissionais") ?? "[]",
  });
}

export async function createServico(
  _prevState: ServicoActionState,
  formData: FormData,
): Promise<ServicoActionState> {
  const parsed = parseForm(formData);

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const existing = await prisma.servico.findUnique({ where: { nome: parsed.data.nome } });
  if (existing) {
    return { error: "Já existe um serviço com este nome." };
  }

  const { salas, profissionais, ...dados } = parsed.data;
  await prisma.servico.create({
    data: {
      ...dados,
      salas: { create: salas },
      profissionais: { create: profissionais.map((usuarioId) => ({ usuarioId })) },
    },
  });

  revalidatePath("/servicos");
  return { success: true };
}

export async function updateServico(
  id: string,
  _prevState: ServicoActionState,
  formData: FormData,
): Promise<ServicoActionState> {
  const parsed = parseForm(formData);

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const existing = await prisma.servico.findUnique({ where: { nome: parsed.data.nome } });
  if (existing && existing.id !== id) {
    return { error: "Já existe um serviço com este nome." };
  }

  const { salas, profissionais, ...dados } = parsed.data;
  await prisma.$transaction([
    prisma.salaServico.deleteMany({ where: { servicoId: id } }),
    prisma.usuarioServico.deleteMany({ where: { servicoId: id } }),
    prisma.servico.update({
      where: { id },
      data: {
        ...dados,
        salas: { create: salas },
        profissionais: { create: profissionais.map((usuarioId) => ({ usuarioId })) },
      },
    }),
  ]);

  revalidatePath("/servicos");
  return { success: true };
}

export async function deleteServico(id: string) {
  const servico = await prisma.servico.findUnique({
    where: { id },
    include: { _count: { select: { agendamentos: true } } },
  });

  if (!servico) return;

  if (servico._count.agendamentos > 0) {
    throw new Error("Serviço em uso não pode ser excluído.");
  }

  await prisma.servico.delete({ where: { id } });
  revalidatePath("/servicos");
}
