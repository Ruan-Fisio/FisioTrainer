"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import {
  planoAtribuicaoSchema,
  renovarPlanoSchema,
} from "@/lib/validations/plano-atribuicao";
import {
  calcularDesconto,
  calcularValorParcelado,
  cartaoDaForma,
  formaEfetiva,
  gerarDatasVencimento,
  gerarValoresParcelas,
  maxParcelasPlano,
  valorPlano,
} from "@/lib/planos";
import { getTaxaParcelamentoCartao } from "@/actions/configuracao-financeira";
import {
  contarRealizados,
  planoRenovavel,
  totalAtendimentosPlano,
} from "@/lib/plano-renovacao";
import {
  aplicarGradeRecorrente,
  validarLinhasGrade,
} from "@/actions/grade-recorrente";
import type { GradeRecorrenteLinha } from "@/lib/validations/grade-recorrente";

export async function listPlanoAtribuicoesByPaciente(pacienteId: string) {
  const atribuicoes = await prisma.planoAtribuicao.findMany({
    where: { pacienteId },
    orderBy: { createdAt: "desc" },
    include: { cobrancas: { orderBy: { vencimento: "asc" } } },
  });

  return atribuicoes.map((a) => ({
    ...a,
    valorOriginal: Number(a.valorOriginal),
    desconto: Number(a.desconto),
    valor: Number(a.valor),
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
    valorOriginal: Number(atribuicao.valorOriginal),
    desconto: Number(atribuicao.desconto),
    valor: Number(atribuicao.valor),
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

function parseGradeLinhas(formData: FormData): GradeRecorrenteLinha[] {
  const raw = formData.get("gradeLinhas");
  if (!raw) return [];
  try {
    const parsed = JSON.parse(String(raw));
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function parseForm(formData: FormData) {
  return planoAtribuicaoSchema.safeParse({
    planoId: formData.get("planoId"),
    formaPagamento: formData.get("formaPagamento"),
    periodicidade: formData.get("periodicidade") ?? "MENSAL",
    vencimentos: formData.getAll("vencimentos"),
    descontoTipo: formData.get("descontoTipo") ?? "NENHUM",
    descontoValor: formData.get("descontoValor"),
    valorAlvoParcela: formData.get("valorAlvoParcela"),
  });
}

function mensagemMaxParcelas(
  periodicidade: "MENSAL" | "TRIMESTRAL",
  formaPagamento: "A_VISTA" | "ATE_3X_CARTAO",
  maxParcelas: number,
): string {
  if (periodicidade === "MENSAL") {
    return maxParcelas === 1
      ? "Plano mensal não pode ser parcelado (parcela única)."
      : `Plano mensal permite no máximo ${maxParcelas} parcelas.`;
  }
  return `Trimestral ${formaPagamento === "ATE_3X_CARTAO" ? `em até ${maxParcelas}x no cartão` : "à vista"} permite no máximo ${maxParcelas} parcela(s).`;
}

function gerarParcelasData(
  planoAtribuicaoId: string,
  pacienteId: string,
  planoNome: string,
  valorTotal: number,
  vencimentos: Date[],
  notaFiscal: boolean,
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
    notaFiscal,
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

  const plano = await prisma.plano.findUnique({ where: { id: parsed.data.planoId } });

  if (!plano) {
    return { error: "Plano não encontrado." };
  }

  const gradeLinhas = parseGradeLinhas(formData);
  const erroGrade = await validarLinhasGrade(gradeLinhas, plano.tipos, plano.atendimentos);
  if (erroGrade) return { error: erroGrade };

  const maxParcelas = maxParcelasPlano(
    parsed.data.periodicidade,
    parsed.data.formaPagamento,
    plano.permiteParcelamentoEstendido,
  );
  if (parsed.data.vencimentos.length > maxParcelas) {
    return { error: mensagemMaxParcelas(parsed.data.periodicidade, parsed.data.formaPagamento, maxParcelas) };
  }

  const forma = formaEfetiva(
    parsed.data.periodicidade,
    parsed.data.formaPagamento,
    plano.permiteParcelamentoEstendido,
  );
  const cartao = cartaoDaForma(forma);
  const notaFiscal = true; // nota fiscal sempre inclusa
  const vencimentosOrdenados = [...parsed.data.vencimentos].sort(
    (a, b) => a.getTime() - b.getTime(),
  );
  const valorBase = valorPlano(plano, parsed.data.periodicidade);
  const valorOriginal = cartao
    ? calcularValorParcelado(
        valorBase,
        await getTaxaParcelamentoCartao(),
        vencimentosOrdenados.length,
      )
    : valorBase;
  const { valor, desconto } = calcularDesconto(
    valorOriginal,
    parsed.data.descontoTipo,
    parsed.data.descontoValor,
    parsed.data.valorAlvoParcela,
    vencimentosOrdenados.length,
  );

  const atribuicao = await prisma.$transaction(async (tx) => {
    const criada = await tx.planoAtribuicao.create({
      data: {
        pacienteId,
        planoId: plano.id,
        planoNome: plano.nome,
        atendimentos: plano.atendimentos,
        creditosRemarcacao: plano.creditosRemarcacao,
        formaPagamento: forma,
        periodicidade: parsed.data.periodicidade,
        valorOriginal,
        desconto,
        valor,
        cartao,
        notaFiscal,
        numeroParcelas: vencimentosOrdenados.length,
        dataInicio: vencimentosOrdenados[0],
      },
    });

    const parcelas = gerarParcelasData(
      criada.id,
      pacienteId,
      plano.nome,
      valor,
      vencimentosOrdenados,
      notaFiscal,
    );

    await tx.cobranca.createMany({ data: parcelas });
    return criada;
  });

  await aplicarGradeRecorrente(atribuicao.id, gradeLinhas);

  revalidatePath(`/pacientes/${pacienteId}`);
  revalidatePath("/dashboard");
  revalidatePath("/cobrancas");
  revalidatePath("/agenda");
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

  const plano = await prisma.plano.findUnique({ where: { id: parsed.data.planoId } });

  if (!plano) {
    return { error: "Plano não encontrado." };
  }

  const gradeLinhas = parseGradeLinhas(formData);
  const erroGrade = await validarLinhasGrade(gradeLinhas, plano.tipos, plano.atendimentos);
  if (erroGrade) return { error: erroGrade };

  const maxParcelas = maxParcelasPlano(
    parsed.data.periodicidade,
    parsed.data.formaPagamento,
    plano.permiteParcelamentoEstendido,
  );
  if (parsed.data.vencimentos.length > maxParcelas) {
    return { error: mensagemMaxParcelas(parsed.data.periodicidade, parsed.data.formaPagamento, maxParcelas) };
  }

  const forma = formaEfetiva(
    parsed.data.periodicidade,
    parsed.data.formaPagamento,
    plano.permiteParcelamentoEstendido,
  );
  const cartao = cartaoDaForma(forma);
  const notaFiscal = true; // nota fiscal sempre inclusa
  const vencimentosOrdenados = [...parsed.data.vencimentos].sort(
    (a, b) => a.getTime() - b.getTime(),
  );
  const valorBase = valorPlano(plano, parsed.data.periodicidade);
  const valorOriginal = cartao
    ? calcularValorParcelado(
        valorBase,
        await getTaxaParcelamentoCartao(),
        vencimentosOrdenados.length,
      )
    : valorBase;
  const { valor, desconto } = calcularDesconto(
    valorOriginal,
    parsed.data.descontoTipo,
    parsed.data.descontoValor,
    parsed.data.valorAlvoParcela,
    vencimentosOrdenados.length,
  );

  await prisma.$transaction(async (tx) => {
    await tx.cobranca.deleteMany({
      where: { planoAtribuicaoId: id, status: "PENDENTE" },
    });

    await tx.planoAtribuicao.update({
      where: { id },
      data: {
        planoId: plano.id,
        planoNome: plano.nome,
        atendimentos: plano.atendimentos,
        creditosRemarcacao: plano.creditosRemarcacao,
        formaPagamento: forma,
        periodicidade: parsed.data.periodicidade,
        valorOriginal,
        desconto,
        valor,
        cartao,
        notaFiscal,
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
      notaFiscal,
    );

    await tx.cobranca.createMany({ data: parcelas });
  });

  await aplicarGradeRecorrente(id, gradeLinhas);

  revalidatePath(`/pacientes/${pacienteId}`);
  revalidatePath("/dashboard");
  revalidatePath("/cobrancas");
  revalidatePath("/agenda");
  return { success: true };
}

export async function cancelarPlanoAtribuicao(id: string, pacienteId: string) {
  await prisma.$transaction(async (tx) => {
    await tx.cobranca.deleteMany({
      where: { planoAtribuicaoId: id, status: "PENDENTE" },
    });
    // Grade recorrente: desativa o modelo e apaga os agendamentos futuros já semeados.
    await tx.agendamento.deleteMany({
      where: {
        planoAtribuicaoId: id,
        gradeRecorrenteId: { not: null },
        status: "AGENDADO",
        dataInicio: { gt: new Date() },
      },
    });
    await tx.gradeRecorrenteAtendimento.updateMany({
      where: { planoAtribuicaoId: id },
      data: { ativo: false },
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

/* ------------------------------------------------------------------ *
 * Renovação (aba Renovações de /planos)
 * ------------------------------------------------------------------ */

/**
 * Planos atribuídos ATIVOS que já cumpriram todo o período (todos os atendimentos
 * executados — Compareceu/Faltou — e todas as cobranças pagas). É só um lembrete para
 * a clínica renovar; ver `planoRenovavel` (`src/lib/plano-renovacao.ts`).
 */
export async function listPlanosRenovaveis() {
  const atribuicoes = await prisma.planoAtribuicao.findMany({
    where: { status: "ATIVO" },
    orderBy: { dataInicio: "asc" },
    include: {
      paciente: { select: { id: true, nome: true } },
      cobrancas: { select: { status: true } },
      agendamentos: { select: { status: true } },
      plano: { select: { id: true, permiteParcelamentoEstendido: true } },
    },
  });

  return atribuicoes
    .filter((a) =>
      planoRenovavel({
        atendimentos: a.atendimentos,
        periodicidade: a.periodicidade,
        cobrancas: a.cobrancas,
        agendamentos: a.agendamentos,
      }),
    )
    .map((a) => ({
      id: a.id,
      pacienteId: a.pacienteId,
      pacienteNome: a.paciente.nome,
      planoNome: a.planoNome,
      periodicidade: a.periodicidade,
      atendimentos: a.atendimentos,
      total: totalAtendimentosPlano(a.atendimentos, a.periodicidade),
      realizados: contarRealizados(a.agendamentos),
      cobrancasPagas: a.cobrancas.length,
      dataInicio: a.dataInicio,
      temPlano: a.plano != null,
      maxParcelas: maxParcelasPlano(
        a.periodicidade,
        a.formaPagamento,
        a.plano?.permiteParcelamentoEstendido ?? false,
      ),
    }));
}

export type RenovarPlanoState = { error?: string; success?: boolean };

/**
 * Renova um plano atribuído: marca a atribuição atual como `CONCLUIDO` (fica no histórico
 * do paciente), desativa a grade dela e cria uma nova atribuição ATIVA + novas cobranças.
 * Copia periodicidade/forma/desconto da anterior e recalcula o valor pelos preços atuais
 * do `Plano`. A grade **não** é copiada.
 */
export async function renovarPlanoAtribuicao(
  atribuicaoId: string,
  primeiraData: string,
  numeroParcelas: number,
): Promise<RenovarPlanoState> {
  const parsed = renovarPlanoSchema.safeParse({ primeiraData, numeroParcelas });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const antiga = await prisma.planoAtribuicao.findUnique({
    where: { id: atribuicaoId },
    include: {
      cobrancas: { select: { status: true } },
      agendamentos: { select: { status: true } },
      plano: true,
    },
  });
  if (!antiga || antiga.status !== "ATIVO") {
    return { error: "Atribuição não encontrada ou já encerrada." };
  }
  if (!antiga.plano) {
    return { error: "O plano do catálogo foi removido — cadastre-o de novo para renovar." };
  }
  if (
    !planoRenovavel({
      atendimentos: antiga.atendimentos,
      periodicidade: antiga.periodicidade,
      cobrancas: antiga.cobrancas,
      agendamentos: antiga.agendamentos,
    })
  ) {
    return {
      error:
        "Este plano ainda não pode ser renovado (há atendimentos ou pagamentos pendentes).",
    };
  }

  const plano = antiga.plano;
  const forma = antiga.formaPagamento;
  const periodicidade = antiga.periodicidade;
  const maxParcelas = maxParcelasPlano(periodicidade, forma, plano.permiteParcelamentoEstendido);
  if (parsed.data.numeroParcelas > maxParcelas) {
    return { error: `Esta forma de pagamento permite no máximo ${maxParcelas} parcela(s).` };
  }

  const vencimentos = gerarDatasVencimento(
    parsed.data.primeiraData,
    parsed.data.numeroParcelas,
  ).map((d) => new Date(`${d}T12:00:00`));

  const notaFiscal = true;
  const cartao = cartaoDaForma(forma);
  const valorBase = valorPlano(plano, periodicidade);
  const valorOriginal = cartao
    ? calcularValorParcelado(valorBase, await getTaxaParcelamentoCartao(), vencimentos.length)
    : valorBase;
  const { valor, desconto } = calcularDesconto(
    valorOriginal,
    "VALOR",
    Number(antiga.desconto),
    0,
    vencimentos.length,
  );

  await prisma.$transaction(async (tx) => {
    await tx.planoAtribuicao.update({
      where: { id: antiga.id },
      data: { status: "CONCLUIDO" },
    });
    await tx.gradeRecorrenteAtendimento.updateMany({
      where: { planoAtribuicaoId: antiga.id },
      data: { ativo: false },
    });

    const nova = await tx.planoAtribuicao.create({
      data: {
        pacienteId: antiga.pacienteId,
        planoId: plano.id,
        planoNome: plano.nome,
        atendimentos: plano.atendimentos,
        creditosRemarcacao: plano.creditosRemarcacao,
        formaPagamento: forma,
        periodicidade,
        valorOriginal,
        desconto,
        valor,
        cartao,
        notaFiscal,
        numeroParcelas: vencimentos.length,
        dataInicio: vencimentos[0],
      },
    });

    await tx.cobranca.createMany({
      data: gerarParcelasData(
        nova.id,
        antiga.pacienteId,
        plano.nome,
        valor,
        vencimentos,
        notaFiscal,
      ),
    });
  });

  revalidatePath("/planos");
  revalidatePath(`/pacientes/${antiga.pacienteId}`);
  revalidatePath("/cobrancas");
  revalidatePath("/dashboard");
  return { success: true };
}
