import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { lerPdfContrato } from "@/lib/contrato-storage";
import { formatarNumeroContrato } from "@/lib/contrato-regras";
import { prisma } from "@/lib/prisma";

/** PDF assinado, para a equipe. O paciente baixa pela página de assinatura. */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  const { id } = await params;
  const contrato = await prisma.contrato.findUnique({
    where: { id },
    select: { numero: true, pdfChave: true },
  });
  if (!contrato?.pdfChave) {
    return NextResponse.json({ error: "Contrato assinado não encontrado." }, { status: 404 });
  }

  const bytes = await lerPdfContrato(contrato.pdfChave);
  const nome = `Contrato_${formatarNumeroContrato(contrato.numero)}.pdf`;
  return new NextResponse(new Uint8Array(bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${nome}"`,
    },
  });
}
