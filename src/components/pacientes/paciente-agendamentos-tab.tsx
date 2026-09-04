"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { addMonths, format, startOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import {
  CalendarCheck,
  CalendarX,
  Check,
  ChevronLeft,
  ChevronRight,
  Loader2,
  RotateCcw,
  X,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { pacientePodeDesmarcar } from "@/lib/agendamento-cancelamento";
import {
  MODALIDADE_AGENDAMENTO_LABEL,
  STATUS_AGENDAMENTO_LABEL,
} from "@/components/agendamentos/agendamento-labels";
import { tipoPlanoLabels } from "@/lib/validations/plano";
import { AgendamentoAssistidoDialog } from "@/components/pacientes/agendamento-assistido-dialog";
import {
  atualizarStatusAgendamento,
  desmarcarAgendamentoPeloPaciente,
  getConsumoPlanoPaciente,
} from "@/actions/agendamentos";

type Resumo = Awaited<ReturnType<typeof getConsumoPlanoPaciente>>;
type StatusMarcado = "COMPARECEU" | "FALTOU" | "AGENDADO" | "CANCELADO";

function ordinal(n: number) {
  return `${n}º atendimento`;
}

function quandoLabel(data: Date) {
  // Ancorado no horário de Brasília, não no fuso do navegador.
  const s = data
    .toLocaleString("pt-BR", {
      weekday: "long",
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "America/Sao_Paulo",
    })
    .replace(",", "");
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function CirculoNumero({ n, usado }: { n: number; usado: boolean }) {
  return (
    <span
      className={cn(
        "flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-bold tabular-nums",
        usado
          ? "bg-primary text-primary-foreground shadow-sm shadow-primary/20"
          : "border border-dashed border-muted-foreground/40 text-muted-foreground",
      )}
    >
      {n}
    </span>
  );
}

export function PacienteAgendamentosTab({
  pacienteId,
  resumoInicial,
  anoInicial,
  mesInicial,
  somenteLeitura = false,
}: {
  pacienteId: string;
  resumoInicial: Resumo;
  anoInicial: number;
  mesInicial: number;
  /** Portal público do paciente: esconde as ações Compareceu/Faltou, mantém o agendar. */
  somenteLeitura?: boolean;
}) {
  const [mesRef, setMesRef] = useState(
    () => new Date(anoInicial, mesInicial - 1, 1),
  );
  const [outroMes, setOutroMes] = useState<{ chave: string; dados: Resumo } | null>(null);
  const [carregando, startTransition] = useTransition();

  const [statusOverride, setStatusOverride] = useState<Record<string, StatusMarcado>>({});
  const [marcando, startMarcando] = useTransition();
  const router = useRouter();

  function aoDesmarcar(agId: string) {
    setStatusOverride((prev) => ({ ...prev, [agId]: "CANCELADO" }));
    setOutroMes(null);
    router.refresh();
  }

  const chaveInicial = `${anoInicial}-${mesInicial}`;
  const chaveMes = `${mesRef.getFullYear()}-${mesRef.getMonth() + 1}`;
  const ehMesInicial = chaveMes === chaveInicial;

  const resumo: Resumo | null = ehMesInicial
    ? resumoInicial
    : outroMes?.chave === chaveMes
      ? outroMes.dados
      : null;

  useEffect(() => {
    if (ehMesInicial || outroMes?.chave === chaveMes) return;
    startTransition(async () => {
      const dados = await getConsumoPlanoPaciente(
        pacienteId,
        mesRef.getFullYear(),
        mesRef.getMonth() + 1,
      );
      setOutroMes({ chave: chaveMes, dados });
    });
  }, [ehMesInicial, outroMes, chaveMes, mesRef, pacienteId]);

  function marcar(agId: string, status: "COMPARECEU" | "FALTOU" | "AGENDADO") {
    setStatusOverride((prev) => ({ ...prev, [agId]: status }));
    startMarcando(async () => {
      try {
        await atualizarStatusAgendamento(agId, status);
        toast.success(
          status === "COMPARECEU"
            ? "Marcado como compareceu."
            : status === "FALTOU"
              ? "Marcado como faltou."
              : "Status revertido para agendado.",
        );
      } catch {
        setStatusOverride((prev) => {
          const resto = { ...prev };
          delete resto[agId];
          return resto;
        });
        toast.error("Não foi possível atualizar o status.");
      }
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          size="icon"
          onClick={() => setMesRef((m) => startOfMonth(addMonths(m, -1)))}
        >
          <ChevronLeft className="size-4" />
        </Button>
        <span className="text-sm font-medium capitalize">
          {format(mesRef, "MMMM yyyy", { locale: ptBR })}
        </span>
        <Button
          variant="outline"
          size="icon"
          onClick={() => setMesRef((m) => startOfMonth(addMonths(m, 1)))}
        >
          <ChevronRight className="size-4" />
        </Button>
      </div>

      {carregando || resumo == null ? (
        <p className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" /> Carregando…
        </p>
      ) : resumo.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            Este paciente não tem plano ativo. Atribua um plano na aba{" "}
            <span className="font-medium">Planos</span> para controlar os atendimentos.
          </CardContent>
        </Card>
      ) : (
        resumo.map((plano) => {
          const total = plano.atendimentos ?? plano.usados;
          const slots = Array.from({ length: Math.max(total, plano.usados) }, (_, i) => i);

          return (
            <Card key={plano.atribuicaoId}>
              <CardContent className="flex flex-col gap-4 p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="flex flex-col gap-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium">{plano.planoNome}</p>
                      {plano.tipos.map((t) => (
                        <Badge key={t} variant="secondary">
                          {tipoPlanoLabels[t]}
                        </Badge>
                      ))}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {plano.usados} de {total} atendimentos usados neste mês
                    </p>
                  </div>
                  <Badge
                    variant="outline"
                    className={cn(
                      "gap-1",
                      plano.disponiveis === 0 &&
                        "border-destructive/40 bg-destructive/10 text-destructive",
                    )}
                  >
                    <CalendarCheck className="size-3.5" />
                    {plano.disponiveis == null
                      ? "livre"
                      : `${plano.disponiveis} disponíve${plano.disponiveis === 1 ? "l" : "is"}`}
                  </Badge>
                </div>

                <ol className="flex flex-col gap-2">
                  {slots.map((i) => {
                    const agBruto = plano.agendamentos[i];
                    // Cancelamento otimista pelo portal: o slot volta a ficar livre na hora.
                    const ag =
                      agBruto && statusOverride[agBruto.id] === "CANCELADO"
                        ? undefined
                        : agBruto;
                    const statusAtual = ag
                      ? (statusOverride[ag.id] ?? ag.status)
                      : null;
                    const statusInfo = statusAtual
                      ? STATUS_AGENDAMENTO_LABEL[statusAtual]
                      : null;

                    return (
                      <li
                        key={agBruto?.id ?? `vazio-${i}`}
                        className={cn(
                          "flex flex-wrap items-center gap-3 rounded-lg border p-2.5",
                          ag ? "bg-card" : "border-dashed bg-muted/30",
                        )}
                      >
                        <CirculoNumero n={i + 1} usado={!!ag} />
                        <div className="flex min-w-0 flex-1 flex-col">
                          <span className="text-sm font-medium">{ordinal(i + 1)}</span>
                          {ag ? (
                            <span className="text-xs text-muted-foreground">
                              {quandoLabel(ag.dataInicio)}
                              {" · "}
                              {MODALIDADE_AGENDAMENTO_LABEL[ag.modalidade] ?? ag.modalidade}
                              {ag.profissional ? ` · ${ag.profissional}` : ""}
                            </span>
                          ) : (
                            <span className="text-xs text-muted-foreground">
                              Disponível para agendar
                            </span>
                          )}
                        </div>

                        {ag ? (
                          somenteLeitura ? (
                            statusAtual === "AGENDADO" ? (
                              <DesmarcarSlotButton
                                agendamentoId={ag.id}
                                pacienteId={pacienteId}
                                dataInicio={ag.dataInicio}
                                onDesmarcado={() => aoDesmarcar(ag.id)}
                              />
                            ) : statusInfo ? (
                              <Badge
                                variant="outline"
                                className={statusInfo.className}
                              >
                                {statusInfo.label}
                              </Badge>
                            ) : null
                          ) : statusAtual === "AGENDADO" ? (
                            <div className="flex items-center gap-1.5">
                              <Button
                                variant="outline"
                                size="sm"
                                disabled={marcando}
                                onClick={() => marcar(ag.id, "COMPARECEU")}
                              >
                                <Check className="size-4" />
                                Compareceu
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                disabled={marcando}
                                onClick={() => marcar(ag.id, "FALTOU")}
                              >
                                <X className="size-4" />
                                Faltou
                              </Button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1.5">
                              {statusInfo && (
                                <Badge variant="outline" className={statusInfo.className}>
                                  {statusInfo.label}
                                </Badge>
                              )}
                              <Button
                                variant="ghost"
                                size="sm"
                                disabled={marcando}
                                onClick={() => marcar(ag.id, "AGENDADO")}
                                title="Reverter para agendado"
                              >
                                <RotateCcw className="size-4" />
                                <span className="sr-only">Reverter</span>
                              </Button>
                            </div>
                          )
                        ) : (
                          <AgendamentoAssistidoDialog
                            pacienteId={pacienteId}
                            label="Agendar"
                            size="sm"
                          />
                        )}
                      </li>
                    );
                  })}
                </ol>
              </CardContent>
            </Card>
          );
        })
      )}

      {somenteLeitura ? (
        <p className="text-xs text-muted-foreground">
          Cada agendamento consome 1 atendimento do plano no mês. Use o botão{" "}
          <span className="font-medium">Agendar</span> nos horários disponíveis. Você pode{" "}
          <span className="font-medium">desmarcar</span> um atendimento até 2 horas antes do
          horário — a vaga volta para o mês e pode ser reagendada.
        </p>
      ) : (
        <p className="text-xs text-muted-foreground">
          Cada agendamento consome 1 atendimento do plano no mês. Marque novos pela{" "}
          <Link href="/agenda" className="underline underline-offset-2">
            agenda
          </Link>{" "}
          ou pelo botão <span className="font-medium">Agendamentos</span> no topo.
        </p>
      )}
    </div>
  );
}

function DesmarcarSlotButton({
  agendamentoId,
  pacienteId,
  dataInicio,
  onDesmarcado,
}: {
  agendamentoId: string;
  pacienteId: string;
  dataInicio: Date;
  onDesmarcado: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [erro, setErro] = useState<string>();
  const [pending, startPending] = useTransition();
  const dentroDoPrazo = pacientePodeDesmarcar(new Date(dataInicio));

  function confirmar() {
    setErro(undefined);
    startPending(async () => {
      const res = await desmarcarAgendamentoPeloPaciente(agendamentoId, pacienteId);
      if (res.error) {
        setErro(res.error);
        return;
      }
      toast.success("Atendimento desmarcado. Você já pode reagendar neste mês.");
      setOpen(false);
      onDesmarcado();
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setErro(undefined);
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <CalendarX className="size-4" />
          Desmarcar
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {dentroDoPrazo ? "Desmarcar atendimento" : "Fora do prazo para desmarcar"}
          </DialogTitle>
          <DialogDescription>
            {dentroDoPrazo
              ? `Tem certeza que deseja desmarcar o atendimento de ${quandoLabel(
                  new Date(dataInicio),
                )}? A vaga volta a ficar disponível e você pode reagendar dentro deste mês.`
              : "Só é possível desmarcar até 2 horas antes do horário. Como o prazo já passou, não é possível cancelar e a ausência será registrada como falta."}
          </DialogDescription>
        </DialogHeader>

        {erro && <p className="text-sm text-destructive">{erro}</p>}

        <DialogFooter className="flex justify-end gap-2">
          {dentroDoPrazo ? (
            <>
              <DialogClose asChild>
                <Button variant="outline" disabled={pending}>
                  Voltar
                </Button>
              </DialogClose>
              <Button variant="destructive" onClick={confirmar} disabled={pending}>
                {pending ? "Desmarcando…" : "Desmarcar atendimento"}
              </Button>
            </>
          ) : (
            <DialogClose asChild>
              <Button variant="outline">Entendi</Button>
            </DialogClose>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
