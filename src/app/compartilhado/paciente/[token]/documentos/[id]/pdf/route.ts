import { NextResponse } from "next/server";
import { buscarPacienteIdPorToken } from "@/lib/acesso-compartilhado";
import { gerarPdfDocumento } from "@/lib/documentos-paciente";

/**
 * PDF de um documento no portal do paciente. O paciente vem do token (nunca do client)
 * e o documento precisa ser dele — senão 404, sem distinguir "não existe" de "não é seu".
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ token: string; id: string }> },
) {
  const { token, id } = await params;
  const pacienteId = await buscarPacienteIdPorToken(token);
  const pdf = pacienteId ? await gerarPdfDocumento(id, pacienteId) : null;
  if (!pdf) {
    return NextResponse.json({ error: "Documento não encontrado." }, { status: 404 });
  }

  return new NextResponse(new Uint8Array(pdf.bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${pdf.nomeArquivo}"`,
      "Cache-Control": "private, no-store",
      "X-Robots-Tag": "noindex",
    },
  });
}
