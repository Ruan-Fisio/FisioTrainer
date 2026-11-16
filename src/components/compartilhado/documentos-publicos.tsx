import { FileDown, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { formatarData } from "@/lib/format";
import type { DocumentoListado } from "@/lib/documentos-paciente";

/** Documentos emitidos pela clínica (encaminhamentos, exames, atestados…), só leitura. */
export function DocumentosPublicos({
  token,
  documentos,
}: {
  token: string;
  documentos: DocumentoListado[];
}) {
  if (documentos.length === 0) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-sm text-muted-foreground">
          Nenhum documento disponível ainda. Encaminhamentos, solicitações de exames e
          atestados emitidos pela clínica aparecem aqui.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {documentos.map((doc) => (
        <Card key={doc.id}>
          <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-2">
              <FileText className="mt-0.5 size-4 shrink-0 text-primary" />
              <div className="flex min-w-0 flex-col gap-0.5">
                <p className="font-medium">{doc.titulo}</p>
                <p className="text-xs text-muted-foreground">
                  Emitido em {formatarData(doc.createdAt)}
                </p>
              </div>
            </div>
            <Button asChild variant="outline" size="sm" className="self-end sm:self-auto">
              <a
                href={`/compartilhado/paciente/${token}/documentos/${doc.id}/pdf`}
                target="_blank"
                rel="noopener"
              >
                <FileDown />
                Abrir PDF
              </a>
            </Button>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
