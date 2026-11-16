import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { gerarPdfDocumento } from "@/lib/documentos-paciente";

/** PDF preenchido de um documento do paciente, para a equipe. */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  const { id } = await params;
  const pdf = await gerarPdfDocumento(id);
  if (!pdf) {
    return NextResponse.json({ error: "Documento não encontrado." }, { status: 404 });
  }

  return new NextResponse(new Uint8Array(pdf.bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${pdf.nomeArquivo}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
