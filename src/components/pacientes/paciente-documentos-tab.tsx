"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { FileDown, FileText, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatarDataHora } from "@/lib/format";
import { excluirDocumento } from "@/actions/documentos-paciente";
import type { DocumentoListado } from "@/lib/documentos-paciente";

function ExcluirDocumento({ doc }: { doc: DocumentoListado }) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  function excluir() {
    startTransition(async () => {
      try {
        await excluirDocumento(doc.id);
        toast.success("Documento excluído.");
        setOpen(false);
      } catch {
        toast.error("Não foi possível excluir o documento.");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="icon">
          <Trash2 className="size-4 text-destructive" />
          <span className="sr-only">Excluir {doc.titulo}</span>
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Excluir documento</DialogTitle>
          <DialogDescription>
            Excluir “{doc.titulo}” de {formatarDataHora(doc.createdAt)}? Ele também some do
            portal do paciente. Esta ação não pode ser desfeita.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
          <Button variant="destructive" onClick={excluir} disabled={pending}>
            {pending ? "Excluindo..." : "Excluir"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Acoes({ doc, pacienteId }: { doc: DocumentoListado; pacienteId: string }) {
  return (
    <div className="flex items-center justify-end gap-1">
      <Button variant="outline" size="icon" asChild>
        <a href={`/api/documentos/${doc.id}/pdf`} target="_blank" rel="noopener">
          <FileDown className="size-4" />
          <span className="sr-only">Abrir PDF de {doc.titulo}</span>
        </a>
      </Button>
      <Button variant="outline" size="icon" asChild>
        <Link href={`/pacientes/${pacienteId}/documentos/${doc.id}`}>
          <Pencil className="size-4" />
          <span className="sr-only">Editar {doc.titulo}</span>
        </Link>
      </Button>
      <ExcluirDocumento doc={doc} />
    </div>
  );
}

export function PacienteDocumentosTab({
  pacienteId,
  documentos,
}: {
  pacienteId: string;
  documentos: DocumentoListado[];
}) {
  if (documentos.length === 0) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-sm text-muted-foreground">
          Nenhum documento emitido. Encaminhamentos, solicitações de exames, atestados e
          demais documentos aparecem aqui e no portal do paciente.
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      {/* Mobile: cards */}
      <div className="flex flex-col gap-3 md:hidden">
        {documentos.map((doc) => (
          <Card key={doc.id}>
            <CardContent className="flex flex-col gap-3 p-4">
              <div className="flex items-start gap-2">
                <FileText className="mt-0.5 size-4 shrink-0 text-primary" />
                <div className="flex min-w-0 flex-col gap-0.5">
                  <p className="font-medium">{doc.titulo}</p>
                  {doc.resumo && (
                    <p className="truncate text-sm text-muted-foreground">{doc.resumo}</p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    {formatarDataHora(doc.createdAt)}
                    {doc.autor ? ` · ${doc.autor}` : ""}
                  </p>
                </div>
              </div>
              <Acoes doc={doc} pacienteId={pacienteId} />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Desktop: tabela */}
      <Card className="hidden p-0 md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="pl-4">Documento</TableHead>
              <TableHead>Emitido em</TableHead>
              <TableHead>Por</TableHead>
              <TableHead className="pr-4 text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {documentos.map((doc) => (
              <TableRow key={doc.id}>
                <TableCell className="pl-4">
                  <p className="font-medium">{doc.titulo}</p>
                  {doc.resumo && (
                    <p className="max-w-md truncate text-xs text-muted-foreground">{doc.resumo}</p>
                  )}
                </TableCell>
                <TableCell>{formatarDataHora(doc.createdAt)}</TableCell>
                <TableCell>{doc.autor ?? "—"}</TableCell>
                <TableCell className="pr-4">
                  <Acoes doc={doc} pacienteId={pacienteId} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </>
  );
}
