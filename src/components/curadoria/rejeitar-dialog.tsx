"use client";

import { useActionState, useState } from "react";
import { toast } from "sonner";
import { Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  rejeitarPreCadastro,
  type PreCadastroActionState,
} from "@/actions/pre-cadastros";

const initialState: PreCadastroActionState = {};

export function RejeitarDialog({ id, nome }: { id: string; nome: string }) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(
    async (prev: PreCadastroActionState, formData: FormData) => {
      const result = await rejeitarPreCadastro(id, prev, formData);
      if (result.success) {
        toast.success("Pré-cadastro rejeitado.");
        setOpen(false);
      }
      return result;
    },
    initialState,
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <X />
          Rejeitar
        </Button>
      </DialogTrigger>
      <DialogContent>
        <form action={formAction} className="flex flex-col gap-4">
          <DialogHeader>
            <DialogTitle>Rejeitar pré-cadastro</DialogTitle>
            <DialogDescription>
              {nome} não será cadastrado(a) no sistema e ficará no histórico de
              rejeitados.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-2">
            <Label htmlFor={`motivo-${id}`}>Motivo (opcional)</Label>
            <Textarea id={`motivo-${id}`} name="motivo" maxLength={500} />
          </div>
          {state.error && (
            <p role="alert" className="text-sm text-destructive">
              {state.error}
            </p>
          )}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={pending}
            >
              Cancelar
            </Button>
            <Button type="submit" variant="destructive" disabled={pending}>
              {pending && <Loader2 className="animate-spin" />}
              Rejeitar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
