import { NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getRelatorioIndividual } from "@/actions/exame-execucoes";
import {
  montarDadosPaciente,
  montarHistoricoClinico,
  montarSessaoIndividual,
  graficosDaSecao,
} from "@/lib/relatorio-comparativo";
import { RelatorioPdfDocument } from "@/lib/pdf/relatorio-documento";
import { carregarAnexosRelatorio } from "@/lib/pdf/imagens-relatorio";
import { formatarDataHora as formatarData } from "@/lib/format";

/** PDF de uma única execução de exame (impressão individual). */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ execucaoId: string }> },
) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  const { execucaoId } = await params;

  const relatorio = await getRelatorioIndividual(execucaoId);
  if (!relatorio) {
    return NextResponse.json({ error: "Exame não encontrado." }, { status: 404 });
  }

  const [profissional, anexos] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.user!.id! },
      select: { name: true, cref: true, crefito: true },
    }),
    carregarAnexosRelatorio(relatorio.exameEstrutura, relatorio.anexos),
  ]);

  const titulo =
    relatorio.exame.tipo === "EDUCACAO_FISICA"
      ? "Relatório de avaliação de Educação física"
      : "Relatório de Avaliação Fisioterapêutica";

  const buffer = await renderToBuffer(
    RelatorioPdfDocument({
      modo: "individual",
      anexos,
      titulo,
      pacienteNome: relatorio.paciente.nome,
      profissional: profissional
        ? { nome: profissional.name, cref: profissional.cref, crefito: profissional.crefito }
        : null,
      historicoClinico: relatorio.paciente.historicoClinico,
      dadosPaciente: montarDadosPaciente(relatorio.paciente),
      historico: montarHistoricoClinico(relatorio.paciente),
      sessao: montarSessaoIndividual(
        relatorio.exame.nome,
        relatorio.tipo,
        formatarData(relatorio.data),
      ),
      secoes: relatorio.secoes,
      graficos: relatorio.secoes.flatMap((secao) => graficosDaSecao(secao)),
      temLinhaComIdeal: relatorio.secoes.some((secao) =>
        secao.linhas.some((linha) => linha.valorIdeal !== null),
      ),
      geradoEm: formatarData(new Date()),
    }),
  );

  const nomeArquivo = `Ficha_${relatorio.paciente.nome.replace(/\s+/g, "_")}.pdf`;

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${nomeArquivo}"`,
    },
  });
}
