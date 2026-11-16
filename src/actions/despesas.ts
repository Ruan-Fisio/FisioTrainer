"use server";

import { revalidatePath } from "next/cache";
import { inicioDoDia } from "@/lib/datas-brasilia";
import {
  intervaloDoMes,
  resumirDespesasMes,
  type FiltrosDespesas,
} from "@/lib/despesas";
import { mesReferencia } from "@/lib/financeiro";
import { prisma } from "@/lib/prisma";
import { despesaSchema } from "@/lib/validations/despesa";
import { exigirSessao } from "@/lib/sessao";

const POR_PAGINA = 20;

export type DespesaActionState = {
  error?: string;
  success?: boolean;
  /** Mês da despesa salva, para voltar à listagem já nele. */
  mes?: string;
};

export async function listDespesas(filters: FiltrosDespesas, page = 1) {
  await exigirSessao();

  const { inicio, fim } = intervaloDoMes(filters.mes);
  const where = {
    data: { gte: inicio, lt: fim },
    ...(filters.categorias.length > 0 && { categoria: { in: filters.categorias } }),
    ...(filters.status.length > 0 && { status: { in: filters.status } }),
    ...(filters.q && {
      OR: (["descricao", "fornecedor", "numeroDocumento"] as const).map((campo) => ({
        [campo]: { contains: filters.q, mode: "insensitive" as const },
      })),
    }),
  };

  const [despesas, total] = await Promise.all([
    prisma.despesa.findMany({
      where,
      orderBy: [{ data: "desc" }, { createdAt: "desc" }],
      skip: (page - 1) * POR_PAGINA,
      take: POR_PAGINA,
    }),
    prisma.despesa.count({ where }),
  ]);

  return {
    despesas: despesas.map((d) => ({ ...d, valor: Number(d.valor) })),
    total,
    totalPaginas: Math.ceil(total / POR_PAGINA),
  };
}

/** KPIs e categorias do mês, mais as contas vencidas de outros meses. */
export async function getResumoDespesas(mes: string) {
  await exigirSessao();

  const agora = new Date();
  const { inicio, fim } = intervaloDoMes(mes);
  const despesas = await prisma.despesa.findMany({
    where: {
      OR: [
        { data: { gte: inicio, lt: fim } },
        { status: "PENDENTE", data: { lt: inicioDoDia(agora) } },
      ],
    },
    orderBy: { data: "asc" },
  });
  const linhas = despesas.map((d) => ({ ...d, valor: Number(d.valor) }));

  return {
    resumo: resumirDespesasMes(linhas, mes, agora),
    atrasadasOutrosMeses: linhas.filter(
      (d) => d.status === "PENDENTE" && d.data < inicioDoDia(agora) && mesReferencia(d.data) !== mes,
    ),
  };
}

export async function getDespesa(id: string) {
  await exigirSessao();

  const despesa = await prisma.despesa.findUnique({ where: { id } });
  return despesa && { ...despesa, valor: Number(despesa.valor) };
}

function parseForm(formData: FormData) {
  const texto = (campo: string) => {
    const valor = formData.get(campo);
    return typeof valor === "string" ? valor : undefined;
  };

  return despesaSchema.safeParse({
    descricao: texto("descricao") ?? "",
    categoria: texto("categoria"),
    valor: texto("valor") ?? "",
    data: texto("data") ?? "",
    status: texto("status"),
    pagoEm: texto("pagoEm"),
    fornecedor: texto("fornecedor"),
    numeroDocumento: texto("numeroDocumento"),
    observacao: texto("observacao"),
  });
}

function revalidar() {
  revalidatePath("/dashboard");
}

export async function createDespesa(
  _prevState: DespesaActionState,
  formData: FormData,
): Promise<DespesaActionState> {
  await exigirSessao();

  const parsed = parseForm(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  await prisma.despesa.create({ data: parsed.data });
  revalidar();
  return { success: true, mes: mesReferencia(parsed.data.data) };
}

export async function updateDespesa(
  id: string,
  _prevState: DespesaActionState,
  formData: FormData,
): Promise<DespesaActionState> {
  await exigirSessao();

  const parsed = parseForm(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const existe = await prisma.despesa.findUnique({ where: { id }, select: { id: true } });
  if (!existe) return { error: "Despesa não encontrada." };

  await prisma.despesa.update({ where: { id }, data: parsed.data });
  revalidar();
  return { success: true, mes: mesReferencia(parsed.data.data) };
}

export async function marcarDespesaPaga(id: string) {
  await exigirSessao();

  await prisma.despesa.update({
    where: { id },
    data: { status: "PAGO", pagoEm: new Date() },
  });
  revalidar();
}

export async function deleteDespesa(id: string) {
  await exigirSessao();

  await prisma.despesa.delete({ where: { id } });
  revalidar();
}
