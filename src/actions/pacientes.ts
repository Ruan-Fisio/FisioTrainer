"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { pacienteSchema } from "@/lib/validations/paciente";
import { deleteObjects, deletePrefix } from "@/lib/r2";
import { prefixoPaciente } from "@/lib/storage-keys";

const PAGE_SIZE = 10;

export async function listPacientes(filters: { q?: string }, page: number) {
  const where = filters.q
    ? {
        OR: [
          { nome: { contains: filters.q, mode: "insensitive" as const } },
          { cpf: { contains: filters.q, mode: "insensitive" as const } },
        ],
      }
    : {};

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
    orderBy: { nome: "asc" },
    select: { id: true, nome: true },
  });
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

export async function deletePaciente(id: string) {
  // Anexos do pré-cadastro que originou o paciente (o vínculo vira null no delete).
  const anexosPre = await prisma.preCadastroArquivo.findMany({
    where: { preCadastro: { pacienteId: id } },
    select: { id: true, chave: true },
  });
  const temImagens =
    (await prisma.exameExecucaoImagem.count({
      where: { execucao: { pacienteId: id } },
    })) + (await prisma.pacienteAnexo.count({ where: { pacienteId: id } }));
  await prisma.paciente.delete({ where: { id } });
  if (anexosPre.length > 0) {
    await prisma.preCadastroArquivo.deleteMany({
      where: { id: { in: anexosPre.map((a) => a.id) } },
    });
    try {
      await deleteObjects(anexosPre.map((a) => a.chave));
    } catch (e) {
      console.error("Falha ao apagar anexos de pré-cadastro do paciente", e);
    }
  }
  if (temImagens > 0) {
    try {
      await deletePrefix(prefixoPaciente(id));
    } catch (e) {
      console.error("Falha ao apagar imagens do paciente no R2", e);
    }
  }
  revalidatePath("/pacientes");
}
