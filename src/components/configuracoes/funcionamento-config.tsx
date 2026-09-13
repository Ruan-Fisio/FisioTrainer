"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { CalendarDays, CalendarOff, Plus, Trash2 } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
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
import {
  createFeriado,
  deleteFeriado,
  setDiaFuncionamento,
  type FuncionamentoActionState,
} from "@/actions/funcionamento";
import type { DiaSemana } from "@/generated/prisma/enums";

type DiaFuncionamento = { diaSemana: DiaSemana; label: string; aberto: boolean };
type Feriado = { id: string; data: Date | string; descricao: string };

const initial: FuncionamentoActionState = {};

const formatarDataFeriado = (data: Date | string) =>
  new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC", dateStyle: "long" }).format(
    new Date(data),
  );

export function FuncionamentoConfig({
  dias,
  feriados,
}: {
  dias: DiaFuncionamento[];
  feriados: Feriado[];
}) {
  return (
    <div className="flex flex-col gap-4">
      <DiasSemanaCard dias={dias} />
      <FeriadosCard feriados={feriados} />
    </div>
  );
}

function DiasSemanaCard({ dias }: { dias: DiaFuncionamento[] }) {
  const [isPending, startTransition] = useTransition();
  const [pendente, setPendente] = useState<DiaSemana | null>(null);

  function alternar(diaSemana: DiaSemana, aberto: boolean) {
    setPendente(diaSemana);
    startTransition(async () => {
      try {
        await setDiaFuncionamento(diaSemana, aberto);
      } catch {
        toast.error("Não foi possível salvar o dia.");
      } finally {
        setPendente(null);
      }
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CalendarDays className="size-4 shrink-0 text-sidebar-primary" />
          Dias da semana
        </CardTitle>
        <CardDescription>
          Marque os dias em que a clínica atende. Dias desmarcados bloqueiam qualquer
          agendamento naquele dia da semana.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {dias.map((dia) => (
            <Label
              key={dia.diaSemana}
              htmlFor={`dia-${dia.diaSemana}`}
              className={cn(
                "flex items-center gap-3 rounded-lg border bg-muted/30 px-3 py-2.5 text-sm font-medium",
                (isPending && pendente === dia.diaSemana) && "opacity-50",
              )}
            >
              <Checkbox
                id={`dia-${dia.diaSemana}`}
                checked={dia.aberto}
                disabled={isPending}
                onCheckedChange={(checked) =>
                  alternar(dia.diaSemana, checked === true)
                }
              />
              {dia.label}
            </Label>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function FeriadosCard({ feriados }: { feriados: Feriado[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CalendarOff className="size-4 shrink-0 text-sidebar-primary" />
          Feriados
        </CardTitle>
        <CardDescription>
          Datas em que a clínica não atende. Nenhum agendamento pode ser marcado nesses dias.
        </CardDescription>
        <div className="pt-1">
          <FeriadoFormDialog />
        </div>
      </CardHeader>
      <CardContent>
        {feriados.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum feriado cadastrado.</p>
        ) : (
          <ul className="flex flex-col divide-y rounded-lg border">
            {feriados.map((f) => (
              <li
                key={f.id}
                className="flex items-center justify-between gap-3 px-3 py-2.5 text-sm"
              >
                <span>
                  <span className="font-medium tabular-nums">
                    {formatarDataFeriado(f.data)}
                  </span>
                  <span className="text-muted-foreground"> · {f.descricao}</span>
                </span>
                <ExcluirFeriadoButton id={f.id} descricao={f.descricao} />
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function FeriadoFormDialog() {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  function onSubmit(formData: FormData) {
    startTransition(async () => {
      const result = await createFeriado(initial, formData);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success("Feriado adicionado.");
      setOpen(false);
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="size-4" />
          Novo feriado
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Novo feriado</DialogTitle>
          <DialogDescription>
            Data e um nome para o feriado ou ponto facultativo.
          </DialogDescription>
        </DialogHeader>

        <form action={onSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="feriado-data">Data</Label>
            <Input id="feriado-data" name="data" type="date" required autoFocus />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="feriado-descricao">Descrição</Label>
            <Input
              id="feriado-descricao"
              name="descricao"
              placeholder="Ex.: Natal"
              required
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Salvando..." : "Adicionar feriado"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ExcluirFeriadoButton({ id, descricao }: { id: string; descricao: string }) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleDelete() {
    startTransition(async () => {
      try {
        await deleteFeriado(id);
        toast.success("Feriado removido.");
        setOpen(false);
      } catch {
        toast.error("Não foi possível remover o feriado.");
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
          className="text-muted-foreground hover:text-destructive"
        >
          <Trash2 className="size-4" />
          <span className="sr-only">Remover feriado {descricao}</span>
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Remover feriado</DialogTitle>
          <DialogDescription>
            Tem certeza que deseja remover <strong>{descricao}</strong>? A data volta a
            aceitar agendamentos.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
          <Button variant="destructive" onClick={handleDelete} disabled={isPending}>
            {isPending ? "Removendo..." : "Remover"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
