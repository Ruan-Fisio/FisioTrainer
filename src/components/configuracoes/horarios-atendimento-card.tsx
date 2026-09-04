"use client";

import { useActionState, useEffect, useRef, useTransition } from "react";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { MODALIDADE_AGENDAMENTO_LABEL } from "@/components/agendamentos/agendamento-labels";
import { MODALIDADE_SALA } from "@/lib/salas";
import {
  createHorarioAtendimento,
  alternarAtivoHorarioAtendimento,
  deleteHorarioAtendimento,
  type HorarioAtendimentoActionState,
} from "@/actions/horarios-atendimento";

type Horario = {
  id: string;
  horario: string;
  duracaoMin: number;
  ativo: boolean;
};

const initialState: HorarioAtendimentoActionState = {};

export function HorariosAtendimentoCard({
  modalidade,
  horarios,
}: {
  modalidade: string;
  horarios: Horario[];
}) {
  const [state, formAction] = useActionState(createHorarioAtendimento, initialState);
  const [isPending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.success) {
      formRef.current?.reset();
    }
  }, [state.success]);

  function toggleAtivo(id: string, ativo: boolean) {
    startTransition(async () => {
      await alternarAtivoHorarioAtendimento(id, ativo);
    });
  }

  function remover(id: string) {
    startTransition(async () => {
      await deleteHorarioAtendimento(id);
      toast.success("Horário removido.");
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{MODALIDADE_AGENDAMENTO_LABEL[modalidade]}</CardTitle>
        <CardDescription>
          {MODALIDADE_SALA[modalidade as keyof typeof MODALIDADE_SALA].sala} · até{" "}
          {MODALIDADE_SALA[modalidade as keyof typeof MODALIDADE_SALA].capacidade} pessoa(s) por
          horário
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {horarios.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum horário configurado ainda.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {horarios.map((h) => (
              <div
                key={h.id}
                className="flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm"
              >
                <Checkbox
                  id={`ativo-${h.id}`}
                  checked={h.ativo}
                  onCheckedChange={(checked) => toggleAtivo(h.id, checked === true)}
                  disabled={isPending}
                />
                <Label
                  htmlFor={`ativo-${h.id}`}
                  className={h.ativo ? "font-normal" : "font-normal text-muted-foreground line-through"}
                >
                  {h.horario} ({h.duracaoMin} min)
                </Label>
                <button
                  type="button"
                  onClick={() => remover(h.id)}
                  disabled={isPending}
                  className="text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="size-3.5" />
                  <span className="sr-only">Remover horário {h.horario}</span>
                </button>
              </div>
            ))}
          </div>
        )}

        <form
          ref={formRef}
          action={formAction}
          className="flex flex-wrap items-end gap-2 border-t pt-4"
        >
          <input type="hidden" name="modalidade" value={modalidade} />
          <div className="flex flex-col gap-2">
            <Label htmlFor={`novo-horario-${modalidade}`} className="text-xs">
              Novo horário
            </Label>
            <Input
              id={`novo-horario-${modalidade}`}
              name="horario"
              type="time"
              className="w-32"
              required
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor={`nova-duracao-${modalidade}`} className="text-xs">
              Duração (min)
            </Label>
            <Input
              id={`nova-duracao-${modalidade}`}
              name="duracaoMin"
              type="number"
              min={5}
              max={480}
              defaultValue={50}
              className="w-24"
            />
          </div>
          <Button type="submit" variant="outline" size="sm">
            <Plus className="size-4" />
            Adicionar
          </Button>
        </form>
        {state.error && <p className="text-sm text-destructive">{state.error}</p>}
      </CardContent>
    </Card>
  );
}
