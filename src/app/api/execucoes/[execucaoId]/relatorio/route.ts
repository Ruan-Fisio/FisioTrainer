import { NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getComparativo } from "@/actions/exame-execucoes";
import {
  montarDadosPaciente,
  montarHistoricoClinico,
  montarSessao,
  graficosDaSecao,
} from "@/lib/relatorio-comparativo";
import { RelatorioPdfDocument } from "@/lib/pdf/relatorio-documento";

function formatarData(data: Date) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(data);
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ execucaoId: string }> },
) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  const { execucaoId } = await params;
  const retornoId = new URL(request.url).searchParams.get("retornoId");

  if (!retornoId) {
    return NextResponse.json({ error: "retornoId é obrigatório." }, { status: 400 });
  }

  const comparativo = await getComparativo(execucaoId, retornoId);
  if (!comparativo) {
    return NextResponse.json({ error: "Comparativo não encontrado." }, { status: 404 });
  }

  const profissional = await prisma.user.findUnique({
    where: { id: session.user!.id! },
    select: { name: true, cref: true, crefito: true },
  });

  const titulo =
    comparativo.exame.tipo === "EDUCACAO_FISICA"
      ? "Relatório de avaliação de Educação física"
      : "Relatório de Avaliação Fisioterapêutica";

  const buffer = await renderToBuffer(
    RelatorioPdfDocument({
      titulo,
      pacienteNome: comparativo.paciente.nome,
      profissional: profissional
        ? { nome: profissional.name, cref: profissional.cref, crefito: profissional.crefito }
        : null,
      historicoClinico: comparativo.paciente.historicoClinico,
      dadosPaciente: montarDadosPaciente(comparativo.paciente),
      historico: montarHistoricoClinico(comparativo.paciente),
      sessao: montarSessao(
        comparativo.exame.nome,
        formatarData(comparativo.avaliacaoData),
        formatarData(comparativo.retornoData),
      ),
      secoes: comparativo.secoes,
      graficos: comparativo.secoes.flatMap((secao) => graficosDaSecao(secao)),
      temLinhaComIdeal: comparativo.secoes.some((secao) =>
        secao.linhas.some((linha) => linha.valorIdeal !== null),
      ),
      geradoEm: formatarData(new Date()),
    }),
  );

  const nomeArquivo = `Ficha_${comparativo.paciente.nome.replace(/\s+/g, "_")}.pdf`;

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${nomeArquivo}"`,
    },
  });
}
