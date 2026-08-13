"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { toast } from "sonner";
import { Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
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
  importMovimentosCsv,
  type ImportMovimentosState,
} from "@/actions/movimentos";

const initialState: ImportMovimentosState = {};

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Importando..." : "Importar"}
    </Button>
  );
}

export function MovimentoCsvImport() {
  const [open, setOpen] = useState(false);
  const [state, formAction] = useActionState(
    importMovimentosCsv,
    initialState,
  );
  const formRef = useRef<HTMLFormElement>(null);
  const [lastHandledState, setLastHandledState] = useState(state);

  if (state !== lastHandledState) {
    setLastHandledState(state);
    if (state.success) setOpen(false);
  }

  useEffect(() => {
    if (state.success) {
      toast.success(
        `${state.imported} movimento${state.imported !== 1 ? "s" : ""} importado${state.imported !== 1 ? "s" : ""} com sucesso.`,
      );
      formRef.current?.reset();
    }
  }, [state]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Upload />
          Importar CSV
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Importar movimentos via CSV</DialogTitle>
          <DialogDescription>
            O arquivo deve conter as colunas <strong>Nome</strong> e{" "}
            <strong>Grau Ideal</strong> (com cabeçalho), separadas por vírgula
            ou ponto e vírgula. Movimentos com nome já existente terão o grau
            ideal atualizado.
          </DialogDescription>
        </DialogHeader>
        <form ref={formRef} action={formAction} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="file">Arquivo CSV</Label>
            <input
              id="file"
              name="file"
              type="file"
              accept=".csv,text/csv"
              required
              className="h-9 w-full min-w-0 rounded-lg border border-input bg-transparent text-sm transition-colors outline-none file:mr-3 file:h-full file:border-0 file:border-r file:border-input file:bg-transparent file:px-2.5 file:text-sm file:font-medium focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
            />
          </div>
          {state.error && (
            <p className="text-sm text-destructive">{state.error}</p>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <SubmitButton />
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
