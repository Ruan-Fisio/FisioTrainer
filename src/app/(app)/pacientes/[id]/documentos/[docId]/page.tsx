import Link from "next/link";
import { notFound } from "next/navigation";
import { FileDown } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { exigirSessao } from "@/lib/sessao";
import { Button } from "@/components/ui/button";
import { tipoDocumento } from "@/lib/documentos-catalogo";
import { valoresDoBanco } from "@/lib/documentos-paciente";
import { formatarDataHora } from "@/lib/format";
import { atualizarDocumento } from "@/actions/documentos-paciente";
import { DocumentoForm } from "@/components/documentos/documento-form";

export default async function EditarDocumentoPage({
  params,
}: {
  params: Promise<{ id: string; docId: string }>;
}) {
  await exigirSessao();
  const { id, docId } = await params;

  const doc = await prisma.documentoPaciente.findFirst({
    where: { id: docId, pacienteId: id },
    include: {
      paciente: { select: { nome: true } },
      autor: { select: { name: true } },
    },
  });
  const tipo = doc && tipoDocumento(doc.tipo);
  if (!doc || !tipo) notFound();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">{tipo.titulo}</h1>
          <p className="text-sm text-muted-foreground">
            {doc.paciente.nome} · emitido em {formatarDataHora(doc.createdAt)}
            {doc.autor ? ` por ${doc.autor.name}` : ""}
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href={`/api/documentos/${doc.id}/pdf`} target="_blank" prefetch={false}>
            <FileDown />
            Abrir PDF
          </Link>
        </Button>
      </div>
      <DocumentoForm
        tipoSlug={tipo.slug}
        pacienteId={id}
        valores={valoresDoBanco(doc.valores)}
        action={atualizarDocumento.bind(null, doc.id)}
        mode="edit"
      />
    </div>
  );
}
