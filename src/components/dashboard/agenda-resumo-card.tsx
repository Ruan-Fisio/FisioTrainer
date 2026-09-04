"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Check, X, CalendarClock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { RemarcarDialog } from "@/components/agendamentos/remarcar-dialog";
import {
  STATUS_AGENDAMENTO_LABEL,
  MODALIDADE_AGENDAMENTO_LABEL,
} from "@/components/agendamentos/agendamento-labels";
import { cn } from "@/lib/utils";
import { formatarDataHora } from "@/lib/format";
import {
  getProximosAgendamentos,
  type PeriodoProximos,
} from "@/actions/dashboard";
import { atualizarStatusAgendamento } from "@/actions/agendamentos";

type Agendamento = Awaited<ReturnType<typeof getProximosAgendamentos>>[number];
type StatusMarcavel = "COMPARECEU" | "FALTOU";

const PERIODOS: { value: PeriodoProximos; label: string }[] = [
  { value: "dia", label: "Hoje" },
  { value: "semana", label: "Semana" },
  { value: "mes", label: "Mês" },
];

const MODALIDADE_COR: Record<string, string> = {
  EDUCACAO_FISICA:
    "bg-amber-500/10 text-amber-700 ring-amber-500/25 dark:text-amber-400",
  FISIOTERAPIA: "bg-primary/10 text-primary ring-primary/25",
  AVALIACAO: "bg-violet-500/10 text-violet-700 ring-violet-500/25 dark:text-violet-400",
  TERAPIA_MANUAL: "bg-teal-500/10 text-teal-700 ring-teal-500/25 dark:text-teal-400",
};

function nomeParticipante(a: Agendamento) {
  return a.pacientes[0]?.nome ?? a.titulo;
}

// A clínica opera em horário de Brasília — ancorar a exibição nesse fuso.
const TZ = "America/Sao_Paulo";

function horaCurta(d: Date) {
  return d.toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: TZ,
  });
}

function chaveDia(d: Date) {
  return d.toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    timeZone: TZ,
  });
}

export function AgendaResumoCard({
  agendamentosIniciais,
  contagens,
}: {
  agendamentosIniciais: Agendamento[];
  contagens: { dia: number; semana: number; mes: number };
}) {
  const [periodo, setPeriodo] = useState<PeriodoProximos>("dia");
  const [agendamentos, setAgendamentos] = useState(agendamentosIniciais);
  const [confirmacao, setConfirmacao] = useState<{
    agendamento: Agendamento;
    status: StatusMarcavel;
  } | null>(null);
  const [isPending, startTransition] = useTransition();

  function mudarPeriodo(novo: PeriodoProximos) {
    if (novo === periodo) return;
    setPeriodo(novo);
    startTransition(async () => {
      setAgendamentos(await getProximosAgendamentos(novo));
    });
  }

  function confirmarStatus() {
    if (!confirmacao) return;
    const { agendamento, status } = confirmacao;
    startTransition(async () => {
      await atualizarStatusAgendamento(agendamento.id, status);
      setAgendamentos((prev) =>
        prev.map((a) => (a.id === agendamento.id ? { ...a, status } : a)),
      );
      toast.success(
        status === "COMPARECEU" ? "Marcado como compareceu." : "Marcado como faltou.",
      );
      setConfirmacao(null);
    });
  }

  const grupos = useMemo(() => {
    const mapa = new Map<string, Agendamento[]>();
    for (const a of agendamentos) {
      const chave = chaveDia(a.dataInicio);
      const lista = mapa.get(chave) ?? [];
      lista.push(a);
      mapa.set(chave, lista);
    }
    return [...mapa.entries()];
  }, [agendamentos]);

  const mostrarDia = periodo !== "dia";

  return (
    <Card>
      <CardHeader className="flex flex-col gap-4 space-y-0">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <CalendarClock className="size-4 text-muted-foreground" />
            Meus compromissos
          </CardTitle>
          <Button asChild variant="outline" size="sm">
            <Link href="/agenda">Ver agenda</Link>
          </Button>
        </div>

        <div className="grid grid-cols-3 gap-2">
          {PERIODOS.map((opcao) => {
            const ativo = periodo === opcao.value;
            const total = contagens[opcao.value];
            return (
              <button
                key={opcao.value}
                type="button"
                onClick={() => mudarPeriodo(opcao.value)}
                aria-pressed={ativo}
                className={cn(
                  "flex flex-col items-start gap-0.5 rounded-lg border px-3 py-2 text-left transition-colors",
                  ativo
                    ? "border-primary bg-primary/5 ring-1 ring-primary"
                    : "border-border hover:bg-muted/50",
                )}
              >
                <span className="text-xs font-medium text-muted-foreground">
                  {opcao.label}
                </span>
                <span className="text-xl font-bold tabular-nums">{total}</span>
              </button>
            );
          })}
        </div>
      </CardHeader>

      <CardContent
        className={cn(
          "flex flex-col gap-4",
          isPending && "pointer-events-none opacity-60",
        )}
      >
        {agendamentos.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            Nenhum compromisso agendado neste período.
          </p>
        ) : (
          grupos.map(([dia, itens]) => (
            <div key={dia} className="flex flex-col gap-2">
              {mostrarDia && (
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {dia}
                </p>
              )}
              {itens.map((a) => (
                <div
                  key={a.id}
                  className={cn(
                    "flex flex-col gap-3 rounded-lg border p-3 sm:flex-row sm:items-center sm:justify-between",
                    a.status === "COMPARECEU" && "border-green-600/30 bg-green-600/5",
                    a.status === "FALTOU" && "border-destructive/30 bg-destructive/5",
                  )}
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex shrink-0 flex-col items-center rounded-md bg-muted px-2.5 py-1 text-center">
                      <span className="text-sm font-semibold tabular-nums leading-tight">
                        {horaCurta(a.dataInicio)}
                      </span>
                      <span className="text-[10px] text-muted-foreground tabular-nums leading-tight">
                        {horaCurta(a.dataFim)}
                      </span>
                    </div>
                    <div className="flex min-w-0 flex-col gap-1">
                      <span className="flex flex-wrap items-center gap-2 text-sm font-medium">
                        <span className="truncate">{nomeParticipante(a)}</span>
                        {a.pacientes.length > 1 && (
                          <span className="text-xs text-muted-foreground">
                            +{a.pacientes.length - 1}
                          </span>
                        )}
                        {a.status !== "AGENDADO" && (
                          <Badge
                            variant="outline"
                            className={STATUS_AGENDAMENTO_LABEL[a.status].className}
                          >
                            {STATUS_AGENDAMENTO_LABEL[a.status].label}
                          </Badge>
                        )}
                      </span>
                      <span className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                        <span
                          className={cn(
                            "rounded-md px-1.5 py-0.5 text-[11px] font-medium ring-1 ring-inset",
                            MODALIDADE_COR[a.modalidade] ??
                              "bg-muted text-muted-foreground ring-border",
                          )}
                        >
                          {MODALIDADE_AGENDAMENTO_LABEL[a.modalidade]}
                        </span>
                        {a.profissional?.name && <span>{a.profissional.name}</span>}
                      </span>
                    </div>
                  </div>

                  {a.status === "AGENDADO" && (
                    <div className="flex shrink-0 items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={isPending}
                        onClick={() => setConfirmacao({ agendamento: a, status: "COMPARECEU" })}
                      >
                        <Check className="size-4" />
                        <span className="hidden sm:inline">Compareceu</span>
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={isPending}
                        onClick={() => setConfirmacao({ agendamento: a, status: "FALTOU" })}
                      >
                        <X className="size-4" />
                        <span className="hidden sm:inline">Faltou</span>
                      </Button>
                      <RemarcarDialog
                        agendamento={{
                          id: a.id,
                          titulo: a.titulo,
                          modalidade: a.modalidade,
                          profissionalId: a.profissionalId,
                          dataInicio: a.dataInicio,
                          dataFim: a.dataFim,
                        }}
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          ))
        )}
      </CardContent>

      <Dialog open={!!confirmacao} onOpenChange={(open) => !open && setConfirmacao(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {!confirmacao
                ? "Confirmar"
                : confirmacao.status === "COMPARECEU"
                  ? "Marcar como compareceu"
                  : "Marcar como faltou"}
            </DialogTitle>
            <DialogDescription>
              {confirmacao &&
                `Confirma que ${nomeParticipante(confirmacao.agendamento)} ${
                  confirmacao.status === "COMPARECEU" ? "compareceu" : "faltou"
                } em "${confirmacao.agendamento.titulo}" (${formatarDataHora(confirmacao.agendamento.dataInicio)})?`}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmacao(null)} disabled={isPending}>
              Cancelar
            </Button>
            <Button
              variant={confirmacao?.status === "FALTOU" ? "destructive" : "default"}
              onClick={confirmarStatus}
              disabled={isPending}
            >
              {isPending ? "Salvando..." : "Confirmar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
