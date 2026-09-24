import { NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getComparacaoRapida } from "@/actions/exame-execucoes";
import { montarSeriesNumericas } from "@/lib/comparacao-rapida";
import { ComparacaoRapidaPdfDocument } from "@/lib/pdf/comparacao-rapida-documento";
import { formatarData } from "@/lib/format";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ execucaoId: string }> },
) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  const { execucaoId } = await params;
  const execucoesParam = new URL(request.url).searchParams.get("execucoes");

  if (!execucoesParam) {
    return NextResponse.json({ error: "execucoes é obrigatório." }, { status: 400 });
  }

  const execucaoIds = execucoesParam.split(",").filter(Boolean);

  const comparacao = await getComparacaoRapida(execucaoId, execucaoIds);
  if (!comparacao) {
    return NextResponse.json({ error: "Comparação não encontrada." }, { status: 404 });
  }

  const profissional = await prisma.user.findUnique({
    where: { id: session.user!.id! },
    select: { name: true, cref: true, crefito: true },
  });

  const execucoesLabel = comparacao.execucoes.map((e) => ({
    id: e.id,
    label: formatarData(e.data),
  }));

  const series = montarSeriesNumericas(
    comparacao.secoes,
    comparacao.execucoes.map((e) => e.id),
  );

  const buffer = await renderToBuffer(
    ComparacaoRapidaPdfDocument({
      pacienteNome: comparacao.paciente.nome,
      exameNome: comparacao.exame.nome,
      execucoes: execucoesLabel,
      secoes: comparacao.secoes,
      series,
      profissional: profissional
        ? { nome: profissional.name, cref: profissional.cref, crefito: profissional.crefito }
        : null,
      geradoEm: formatarData(new Date()),
    }),
  );

  const nomeArquivo = `Comparacao_${comparacao.paciente.nome.replace(/\s+/g, "_")}.pdf`;

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${nomeArquivo}"`,
    },
  });
}
