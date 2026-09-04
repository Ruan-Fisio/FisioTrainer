"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export function LogDetalhesDialog({
  resumo,
  quando,
  usuario,
  registroId,
  dados,
}: {
  resumo: string;
  quando: string;
  usuario: string;
  registroId: string | null;
  dados: unknown;
}) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          Detalhes
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-sm">{resumo}</DialogTitle>
          <DialogDescription>
            {quando} · {usuario}
            {registroId ? ` · registro ${registroId}` : ""}
          </DialogDescription>
        </DialogHeader>
        <pre className="max-h-[60vh] overflow-auto rounded-md bg-muted p-3 text-xs leading-relaxed">
          {JSON.stringify(dados ?? {}, null, 2)}
        </pre>
      </DialogContent>
    </Dialog>
  );
}
