"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { pacienteSchema } from "@/lib/validations/paciente";
import { auth } from "@/lib/auth";
import { PACIENTE_ATIVO, planejarAgendamentosDaExclusao } from "@/lib/paciente-exclusao";

const PAGE_SIZE = 10;

export async function listPacientes(
  filters: { q?: string; excluidos?: boolean },
  page: number,
) {
  const where = {
    excluidoEm: filters.excluidos ? { not: null } : null,
    ...(filters.q
      ? {
          OR: [
            { nome: { contains: filters.q, mode: "insensitive" as const } },
            { cpf: { contains: filters.q, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };

  const [pacientes, total] = await Promise.all([
    prisma.paciente.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: { _count: { select: { execucoes: true } } },
    }),
    prisma.paciente.count({ where }),
  ]);

  return {
    pacientes,
    total,
    totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
    page,
  };
}

export async function listAllPacientes() {
  return prisma.paciente.findMany({
    where: PACIENTE_ATIVO,
    orderBy: { nome: "asc" },
    select: { id: true, nome: true },
  });
}

/** O CPF é único também entre excluídos: sem este aviso, o erro do banco não diria o motivo. */
async function erroCpfDeExcluido(cpf: string | undefined, idAtual?: string) {
  if (!cpf) return null;
  const excluido = await prisma.paciente.findFirst({
    where: { cpf, excluidoEm: { not: null }, ...(idAtual ? { id: { not: idAtual } } : {}) },
    select: { id: true },
  });
  return excluido
    ? "Este CPF é de um paciente excluído. Restaure o cadastro em Pacientes → Excluídos."
    : null;
}

export type PacienteActionState = {
  error?: string;
  success?: boolean;
};

function parsePacienteForm(formData: FormData) {
  const idadeRaw = formData.get("idade");

  return pacienteSchema.safeParse({
    nome: formData.get("nome"),
    sexo: formData.get("sexo") || undefined,
    idade: idadeRaw ? String(idadeRaw) : undefined,
    dataNascimento: formData.get("dataNascimento") || undefined,
    cpf: formData.get("cpf") || undefined,
    email: formData.get("email") || undefined,
    contato: formData.get("contato") || undefined,
    endereco: formData.get("endereco") || undefined,
    historicoClinico: formData.get("historicoClinico") || undefined,
    objetivo: formData.get("objetivo") || undefined,
    doencasPreexistentes: formData.get("doencasPreexistentes") || undefined,
    cirurgiasAnteriores: formData.get("cirurgiasAnteriores") || undefined,
    medicamentos: formData.get("medicamentos") || undefined,
    numeroIndicacao: formData.get("numeroIndicacao") || undefined,
    pessoaIndicacao: formData.get("pessoaIndicacao") || undefined,
  });
}

export async function createPaciente(
  _prevState: PacienteActionState,
  formData: FormData,
): Promise<PacienteActionState> {
  const parsed = parsePacienteForm(formData);

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const erroCpf = await erroCpfDeExcluido(parsed.data.cpf);
  if (erroCpf) return { error: erroCpf };

  const data = {
    ...parsed.data,
    idade: parsed.data.idade ?? null,
    dataNascimento: parsed.data.dataNascimento
      ? new Date(parsed.data.dataNascimento)
      : null,
    cpf: parsed.data.cpf || null,
    email: parsed.data.email || null,
    endereco: parsed.data.endereco || null,
  };

  // Efetivação de um pré-cadastro: cria o paciente e marca o pré-cadastro como
  // APROVADO na mesma transação (só se ainda estiver PENDENTE).
  const preCadastroId = String(formData.get("preCadastroId") ?? "");
  if (preCadastroId) {
    const pendente = await prisma.preCadastro.findFirst({
      where: { id: preCadastroId, status: "PENDENTE" },
      select: { id: true },
    });
    if (!pendente) {
      return { error: "Este pré-cadastro já foi analisado." };
    }
    await prisma.$transaction(async (tx) => {
      const paciente = await tx.paciente.create({ data });
      await tx.preCadastro.update({
        where: { id: preCadastroId },
        data: {
          status: "APROVADO",
          analisadoEm: new Date(),
          pacienteId: paciente.id,
        },
      });
    });
    revalidatePath("/curadoria");
  } else {
    await prisma.paciente.create({ data });
  }

  revalidatePath("/pacientes");
  return { success: true };
}

export async function updatePaciente(
  id: string,
  _prevState: PacienteActionState,
  formData: FormData,
): Promise<PacienteActionState> {
  const parsed = parsePacienteForm(formData);

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const erroCpf = await erroCpfDeExcluido(parsed.data.cpf, id);
  if (erroCpf) return { error: erroCpf };

  await prisma.paciente.update({
    where: { id },
    data: {
      ...parsed.data,
      idade: parsed.data.idade ?? null,
      dataNascimento: parsed.data.dataNascimento
        ? new Date(parsed.data.dataNascimento)
        : null,
      cpf: parsed.data.cpf || null,
      email: parsed.data.email || null,
      endereco: parsed.data.endereco || null,
    },
  });

  revalidatePath("/pacientes");
  return { success: true };
}

async function exigirSessao() {
  if (!(await auth())) throw new Error("Não autenticado.");
}

/**
 * Exclusão lógica: nada é apagado, nem no banco nem no R2. O paciente some das telas e
 * deixa de ocupar agenda; contratos assinados, exames e histórico financeiro ficam guardados.
 */
export async function deletePaciente(id: string) {
  await exigirSessao();
  const agora = new Date();

  await prisma.$transaction(async (tx) => {
    const { count } = await tx.paciente.updateMany({
      where: { id, excluidoEm: null },
      data: { excluidoEm: agora },
    });
    if (count === 0) return;

    const futuros = await tx.agendamento.findMany({
      where: {
        status: "AGENDADO",
        dataInicio: { gt: agora },
        pacientes: { some: { id } },
      },
      select: { id: true, _count: { select: { pacientes: true } } },
    });
    const { cancelar, desvincular } = planejarAgendamentosDaExclusao(
      futuros.map((a) => ({ id: a.id, totalPacientes: a._count.pacientes })),
    );
    await tx.agendamento.updateMany({
      where: { id: { in: cancelar } },
      data: { status: "CANCELADO" },
    });
    for (const agendamentoId of desvincular) {
      await tx.agendamento.update({
        where: { id: agendamentoId },
        data: { pacientes: { disconnect: { id } } },
      });
    }

    // Sem isso, a grade recriaria os agendamentos ao abrir a agenda.
    await tx.gradeRecorrenteAtendimento.updateMany({
      where: { planoAtribuicao: { pacienteId: id } },
      data: { ativo: false },
    });
    await tx.acessoCompartilhadoPaciente.updateMany({
      where: { pacienteId: id },
      data: { ativo: false },
    });
    await tx.contrato.updateMany({
      where: { pacienteId: id, status: "PENDENTE" },
      data: { status: "CANCELADO" },
    });
  });

  revalidatePath("/pacientes");
  revalidatePath("/agenda");
  revalidatePath("/dashboard");
  revalidatePath("/cobrancas");
  revalidatePath("/contratos");
}

/**
 * Traz o cadastro e o histórico de volta. O que a exclusão desligou não volta sozinho:
 * grade, link do portal e contrato pendente são refeitos pela clínica.
 */
export async function restaurarPaciente(id: string) {
  await exigirSessao();
  await prisma.paciente.updateMany({
    where: { id, excluidoEm: { not: null } },
    data: { excluidoEm: null },
  });
  revalidatePath("/pacientes");
  revalidatePath("/dashboard");
  revalidatePath("/cobrancas");
  revalidatePath("/contratos");
}
