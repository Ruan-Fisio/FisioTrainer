"use client";

import { useState, useTransition, type ReactNode } from "react";
import { toast } from "sonner";
import { DoorOpen, Pencil, Plus, Trash2 } from "lucide-react";
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { cn } from "@/lib/utils";
import { createSala, updateSala, deleteSala, type SalaActionState } from "@/actions/salas";

type Sala = {
  id: string;
  nome: string;
  capacidadeEducacaoFisica: number;
  capacidadeFisioterapia: number;
};

const initial: SalaActionState = {};

const MODALIDADES = [
  { campo: "capacidadeEducacaoFisica", label: "Educação Física", ponto: "bg-amber-500" },
  { campo: "capacidadeFisioterapia", label: "Fisioterapia", ponto: "bg-primary" },
] as const;

export function SalasConfig({ salas }: { salas: Sala[] }) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <p className="max-w-prose text-sm text-muted-foreground">
          Cada sala tem um nome e o número de pessoas que podem ser atendidas por horário em
          Educação Física e em Fisioterapia. Avaliação e Terapia Manual não são configuradas
          aqui.
        </p>
        <SalaFormDialog
          trigger={
            <Button size="sm" className="shrink-0">
              <Plus className="size-4" />
              Nova sala
            </Button>
          }
        />
      </div>

      <div className="flex flex-col gap-3">
        {salas.map((sala) => (
          <SalaCard key={sala.id} sala={sala} podeExcluir={salas.length > 1} />
        ))}
      </div>
    </div>
  );
}

function SalaCard({ sala, podeExcluir }: { sala: Sala; podeExcluir: boolean }) {
  const valores = [sala.capacidadeEducacaoFisica, sala.capacidadeFisioterapia];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <DoorOpen className="size-4 shrink-0 text-sidebar-primary" />
          {sala.nome}
        </CardTitle>
        <CardAction className="flex items-center gap-1">
          <SalaFormDialog
            sala={sala}
            trigger={
              <Button variant="ghost" size="icon" className="text-muted-foreground">
                <Pencil className="size-4" />
                <span className="sr-only">Editar {sala.nome}</span>
              </Button>
            }
          />
          <ExcluirSalaDialog id={sala.id} nome={sala.nome} desabilitado={!podeExcluir} />
        </CardAction>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-2">
          {MODALIDADES.map((m, i) => (
            <div
              key={m.campo}
              className="inline-flex items-center gap-2 rounded-lg border bg-muted/30 px-3 py-2 text-sm"
            >
              <span className={cn("size-2 rounded-full", m.ponto)} />
              <span className="font-medium">{m.label}</span>
              <span className="text-muted-foreground">·</span>
              <span className="font-semibold tabular-nums">{valores[i]}</span>
              <span className="text-xs text-muted-foreground">pessoas/horário</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function SalaFormDialog({ sala, trigger }: { sala?: Sala; trigger: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const edicao = Boolean(sala);

  function onSubmit(formData: FormData) {
    startTransition(async () => {
      const result = sala
        ? await updateSala(sala.id, initial, formData)
        : await createSala(initial, formData);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success(edicao ? "Sala atualizada." : "Sala criada.");
      setOpen(false);
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{edicao ? "Editar sala" : "Nova sala"}</DialogTitle>
          <DialogDescription>
            Nome da sala e capacidade de pessoas por horário em Educação Física e Fisioterapia.
          </DialogDescription>
        </DialogHeader>

        <form action={onSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="sala-nome">Nome da sala</Label>
            <Input
              id="sala-nome"
              name="nome"
              defaultValue={sala?.nome}
              placeholder="Ex.: Sala 4 - Pilates"
              required
              autoFocus
            />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {MODALIDADES.map((m) => {
              const valor =
                m.campo === "capacidadeEducacaoFisica"
                  ? sala?.capacidadeEducacaoFisica
                  : sala?.capacidadeFisioterapia;
              return (
                <div
                  key={m.campo}
                  className="flex flex-col gap-1.5 rounded-lg border bg-muted/30 p-3"
                >
                  <Label
                    htmlFor={`sala-${m.campo}`}
                    className="flex items-center gap-2 text-sm font-medium"
                  >
                    <span className={cn("size-2 rounded-full", m.ponto)} />
                    {m.label}
                  </Label>
                  <Input
                    id={`sala-${m.campo}`}
                    name={m.campo}
                    type="number"
                    inputMode="numeric"
                    min={0}
                    max={100}
                    defaultValue={valor ?? 1}
                    className="h-9 w-full text-base tabular-nums"
                  />
                  <span className="text-xs text-muted-foreground">pessoas por horário</span>
                </div>
              );
            })}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending
                ? "Salvando..."
                : edicao
                  ? "Salvar alterações"
                  : "Criar sala"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ExcluirSalaDialog({
  id,
  nome,
  desabilitado,
}: {
  id: string;
  nome: string;
  desabilitado: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleDelete() {
    startTransition(async () => {
      try {
        await deleteSala(id);
        toast.success("Sala excluída.");
        setOpen(false);
      } catch {
        toast.error("Não foi possível excluir a sala.");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          disabled={desabilitado}
          title={desabilitado ? "É preciso manter ao menos uma sala." : undefined}
          className="text-muted-foreground hover:text-destructive"
        >
          <Trash2 className="size-4" />
          <span className="sr-only">Excluir {nome}</span>
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Excluir sala</DialogTitle>
          <DialogDescription>
            Tem certeza que deseja excluir <strong>{nome}</strong>? A capacidade dela deixa de
            contar para a agenda. Esta ação não pode ser desfeita.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
          <Button variant="destructive" onClick={handleDelete} disabled={isPending}>
            {isPending ? "Excluindo..." : "Excluir"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
