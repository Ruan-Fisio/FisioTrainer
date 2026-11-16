"use server";

import { revalidatePath } from "next/cache";
import type { Prisma, StatusContrato } from "@/generated/prisma/client";
import {
  normalizarQuebras,
  variaveisDesconhecidas,
} from "@/lib/contrato-modelo";
import { getModeloVigente, sincronizarContratoDoPlano } from "@/lib/contratos";
import { prisma } from "@/lib/prisma";
import { exigirSessao } from "@/lib/sessao";

const PAGE_SIZE = 20;

export async function listContratos(
  filters: { q?: string; status?: StatusContrato[] },
  page: number,
) {
  await exigirSessao();

  const where: Prisma.ContratoWhereInput = {
    ...(filters.status?.length ? { status: { in: filters.status } } : {}),
    ...(filters.q
      ? {
          OR: [
            { paciente: { nome: { contains: filters.q, mode: "insensitive" } } },
            { planoAtribuicao: { planoNome: { contains: filters.q, mode: "insensitive" } } },
          ],
        }
      : {}),
  };

  const [itens, total] = await Promise.all([
    prisma.contrato.findMany({
      where,
      orderBy: { numero: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: {
        id: true,
        numero: true,
        token: true,
        status: true,
        assinadoEm: true,
        createdAt: true,
        pacienteId: true,
        paciente: { select: { nome: true, contato: true, cpf: true, excluidoEm: true } },
        planoAtribuicao: { select: { planoNome: true } },
      },
    }),
    prisma.contrato.count({ where }),
  ]);

  return { itens, total, totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)) };
}

export async function getModeloParaEdicao() {
  await exigirSessao();
  const [modelo, usuarios] = await Promise.all([
    getModeloVigente(),
    prisma.user.findMany({
      where: { cpfCnpj: { not: null }, NOT: { cpfCnpj: "" } },
      orderBy: { name: "asc" },
      select: { id: true, name: true, razaoSocial: true, cpfCnpj: true },
    }),
  ]);
  return {
    versao: modelo.versao,
    conteudo: modelo.conteudo,
    contratadaId: modelo.contratada?.id ?? "",
    usuarios,
  };
}

export type ModeloContratoState = { error?: string; success?: boolean; versao?: number };

/** Cada salvamento vira uma nova versão. Contratos assinados guardam o próprio texto. */
export async function salvarModeloContrato(
  _prev: ModeloContratoState,
  formData: FormData,
): Promise<ModeloContratoState> {
  await exigirSessao();

  const conteudo = normalizarQuebras(String(formData.get("conteudo") ?? "")).trim();
  const contratadaId = String(formData.get("contratadaId") ?? "");

  if (conteudo.length < 50) return { error: "O texto do contrato está muito curto." };

  const desconhecidas = variaveisDesconhecidas(conteudo);
  if (desconhecidas.length > 0) {
    return {
      error: `Variável não reconhecida: ${desconhecidas.map((v) => `{{${v}}}`).join(", ")}.`,
    };
  }

  if (!contratadaId) return { error: "Selecione quem é a contratada." };
  const contratada = await prisma.user.findUnique({
    where: { id: contratadaId },
    select: { cpfCnpj: true },
  });
  if (!contratada?.cpfCnpj?.trim()) {
    return { error: "A contratada selecionada não tem CPF/CNPJ cadastrado." };
  }

  const ultima = await prisma.contratoModelo.findFirst({ orderBy: { versao: "desc" } });
  if (ultima && ultima.conteudo === conteudo && ultima.contratadaId === contratadaId) {
    return { success: true, versao: ultima.versao };
  }

  const nova = await prisma.contratoModelo.create({
    data: { versao: (ultima?.versao ?? 0) + 1, conteudo, contratadaId },
  });

  revalidatePath("/contratos");
  return { success: true, versao: nova.versao };
}

/** Para planos atribuídos antes de existir contrato, ou reativados depois de cancelados. */
export async function gerarContratoDoPlano(planoAtribuicaoId: string, pacienteId: string) {
  await exigirSessao();
  await sincronizarContratoDoPlano(planoAtribuicaoId);
  revalidatePath(`/pacientes/${pacienteId}`);
  revalidatePath("/contratos");
}
