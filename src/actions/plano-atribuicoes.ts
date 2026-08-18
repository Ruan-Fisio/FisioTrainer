"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { planoAtribuicaoSchema } from "@/lib/validations/plano-atribuicao";
import { aplicarTaxaCartao, gerarValoresParcelas } from "@/lib/planos";

export async function listPlanoAtribuicoesByPaciente(pacienteId: string) {
  const atribuicoes = await prisma.planoAtribuicao.findMany({
    where: { pacienteId },
    orderBy: { createdAt: "desc" },
    include: { cobrancas: { orderBy: { vencimento: "asc" } } },
  });

  return atribuicoes.map((a) => ({
    ...a,
    valor: Number(a.valor),
    taxaCartao: Number(a.taxaCartao),
    cobrancas: a.cobrancas.map((m) => ({ ...m, valor: Number(m.valor) })),
  }));
}

export async function getPlanoAtribuicao(id: string) {
  const atribuicao = await prisma.planoAtribuicao.findUnique({
    where: { id },
    include: { cobrancas: { orderBy: { vencimento: "asc" } } },
  });
  if (!atribuicao) return null;
  return {
    ...atribuicao,
    valor: Number(atribuicao.valor),
    taxaCartao: Number(atribuicao.taxaCartao),
    cobrancas: atribuicao.cobrancas.map((m) => ({
      ...m,
      valor: Number(m.valor),
    })),
  };
}

export type PlanoAtribuicaoActionState = {
  error?: string;
  success?: boolean;
};

function parseForm(formData: FormData) {
  return planoAtribuicaoSchema.safeParse({
    planoOpcaoId: formData.get("planoOpcaoId"),
    cartao: formData.get("cartao") ?? "false",
    vencimentos: formData.getAll("vencimentos"),
  });
}

async function buscarOpcao(planoOpcaoId: string) {
  return prisma.planoOpcao.findUnique({
    where: { id: planoOpcaoId },
    include: { plano: true },
  });
}

function gerarParcelasData(
  planoAtribuicaoId: string,
  pacienteId: string,
  planoNome: string,
  valorTotal: number,
  vencimentos: Date[],
) {
  const datasOrdenadas = [...vencimentos].sort((a, b) => a.getTime() - b.getTime());
  const valores = gerarValoresParcelas(valorTotal, datasOrdenadas.length);

  return datasOrdenadas.map((vencimento, i) => ({
    pacienteId,
    planoAtribuicaoId,
    planoNome,
    valor: valores[i],
    vencimento,
    status: "PENDENTE" as const,
    numeroParcela: i + 1,
    totalParcelas: datasOrdenadas.length,
  }));
}

export async function createPlanoAtribuicao(
  pacienteId: string,
  _prevState: PlanoAtribuicaoActionState,
  formData: FormData,
): Promise<PlanoAtribuicaoActionState> {
  const parsed = parseForm(formData);

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const opcao = await buscarOpcao(parsed.data.planoOpcaoId);

  if (!opcao) {
    return { error: "Opção de plano não encontrada." };
  }

  const plano = opcao.plano;
  const taxaCartao = Number(plano.taxaCartao);
  const valor = aplicarTaxaCartao(Number(opcao.valor), taxaCartao, parsed.data.cartao);
  const vencimentosOrdenados = [...parsed.data.vencimentos].sort(
    (a, b) => a.getTime() - b.getTime(),
  );

  await prisma.$transaction(async (tx) => {
    const atribuicao = await tx.planoAtribuicao.create({
      data: {
        pacienteId,
        planoId: plano.id,
        planoOpcaoId: opcao.id,
        planoNome: plano.nome,
        atendimentos: opcao.atendimentos,
        valor,
        cartao: parsed.data.cartao,
        taxaCartao: parsed.data.cartao ? taxaCartao : 0,
        numeroParcelas: vencimentosOrdenados.length,
        dataInicio: vencimentosOrdenados[0],
      },
    });

    const parcelas = gerarParcelasData(
      atribuicao.id,
      pacienteId,
      plano.nome,
      valor,
      vencimentosOrdenados,
    );

    await tx.cobranca.createMany({ data: parcelas });
  });

  revalidatePath(`/pacientes/${pacienteId}`);
  revalidatePath("/dashboard");
  revalidatePath("/cobrancas");
  return { success: true };
}

export async function updatePlanoAtribuicao(
  id: string,
  pacienteId: string,
  _prevState: PlanoAtribuicaoActionState,
  formData: FormData,
): Promise<PlanoAtribuicaoActionState> {
  const parsed = parseForm(formData);

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const existing = await prisma.planoAtribuicao.findUnique({ where: { id } });

  if (!existing || existing.pacienteId !== pacienteId) {
    return { error: "Atribuição não encontrada." };
  }

  const opcao = await buscarOpcao(parsed.data.planoOpcaoId);

  if (!opcao) {
    return { error: "Opção de plano não encontrada." };
  }

  const plano = opcao.plano;
  const taxaCartao = Number(plano.taxaCartao);
  const valor = aplicarTaxaCartao(Number(opcao.valor), taxaCartao, parsed.data.cartao);
  const vencimentosOrdenados = [...parsed.data.vencimentos].sort(
    (a, b) => a.getTime() - b.getTime(),
  );

  await prisma.$transaction(async (tx) => {
    await tx.cobranca.deleteMany({
      where: { planoAtribuicaoId: id, status: "PENDENTE" },
    });

    await tx.planoAtribuicao.update({
      where: { id },
      data: {
        planoId: plano.id,
        planoOpcaoId: opcao.id,
        planoNome: plano.nome,
        atendimentos: opcao.atendimentos,
        valor,
        cartao: parsed.data.cartao,
        taxaCartao: parsed.data.cartao ? taxaCartao : 0,
        numeroParcelas: vencimentosOrdenados.length,
        dataInicio: vencimentosOrdenados[0],
        status: "ATIVO",
      },
    });

    const parcelas = gerarParcelasData(
      id,
      pacienteId,
      plano.nome,
      valor,
      vencimentosOrdenados,
    );

    await tx.cobranca.createMany({ data: parcelas });
  });

  revalidatePath(`/pacientes/${pacienteId}`);
  revalidatePath("/dashboard");
  revalidatePath("/cobrancas");
  return { success: true };
}

export async function cancelarPlanoAtribuicao(id: string, pacienteId: string) {
  await prisma.$transaction(async (tx) => {
    await tx.cobranca.deleteMany({
      where: { planoAtribuicaoId: id, status: "PENDENTE" },
    });
    await tx.planoAtribuicao.update({
      where: { id },
      data: { status: "CANCELADO" },
    });
  });

  revalidatePath(`/pacientes/${pacienteId}`);
  revalidatePath("/dashboard");
  revalidatePath("/cobrancas");
}
