"use client";

import { useEffect, useState, useTransition } from "react";
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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { slotsVaziosNoMes } from "@/lib/consumo-plano";
import {
  MODALIDADE_AGENDAMENTO_LABEL,
  STATUS_AGENDAMENTO_LABEL,
} from "@/components/agendamentos/agendamento-labels";
import { tipoPlanoLabels } from "@/lib/validations/plano";
import { AgendamentoAssistidoDialog } from "@/components/pacientes/agendamento-assistido-dialog";
import { GradeRecorrenteDialog } from "@/components/pacientes/grade-recorrente-dialog";
import { RemarcarDialog } from "@/components/agendamentos/remarcar-dialog";
import {
  atualizarStatusAgendamento,
  desmarcarAgendamentoPeloPaciente,
  getConsumoPlanoPaciente,
} from "@/actions/agendamentos";
import type { getGradeRecorrenteContexto } from "@/actions/grade-recorrente";
import type { ModalidadePlano } from "@/components/plano-atribuicoes/grade-section";

type Resumo = Awaited<ReturnType<typeof getConsumoPlanoPaciente>>;
type GradeContexto = Awaited<ReturnType<typeof getGradeRecorrenteContexto>>;
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
  gradeContexto,
}: {
  pacienteId: string;
  resumoInicial: Resumo;
  anoInicial: number;
  mesInicial: number;
  /** Portal público do paciente: esconde as ações Compareceu/Faltou, mantém o agendar. */
  somenteLeitura?: boolean;
  /** Contexto p/ o diálogo "Editar grade" (só lado clínica); ausente no portal. */
  gradeContexto?: GradeContexto;
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

  // `resumoInicial` é recalculado no servidor (nova referência) toda vez que a rota é
  // revalidada — salvar a grade, remarcar ou desmarcar disparam `router.refresh()`/
  // `revalidatePath` em algum componente desta aba. Isso já chega fresco pro mês inicial
  // via prop, mas o cache do "outro mês" (`outroMes`) não tinha como saber que ficou
  // desatualizado — ficava preso no dado antigo até um F5. Zerar aqui força o efeito
  // abaixo a buscar de novo o mês que estiver sendo exibido no momento.
  useEffect(() => {
    setOutroMes(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resumoInicial]);

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
          aria-label="Mês anterior"
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
          aria-label="Próximo mês"
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
          const capacidadeMes = plano.atendimentos ?? plano.usados;
          // Nunca oferecer mais slots vazios do que o plano inteiro ainda permite,
          // para não induzir a marcar além do total (ex. MENSAL 4x já com 3+1).
          const slotsVazios = slotsVaziosNoMes({
            capacidadeMes: plano.atendimentos,
            usadosNoMes: plano.usados,
            disponivelNoPlano: plano.disponiveisTotal,
          });
          const slots = Array.from(
            { length: plano.usados + slotsVazios },
            (_, i) => i,
          );
          const dispBadge = plano.disponiveisTotal ?? plano.disponiveis;

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
                      {plano.usados} de {capacidadeMes} atendimentos neste mês
                      {plano.total != null && plano.total !== capacidadeMes ? (
                        <>
                          {" · "}
                          <span
                            className={cn(
                              plano.disponiveisTotal === 0 && "font-medium text-destructive",
                            )}
                          >
                            {plano.usadosTotal} de {plano.total} no plano
                          </span>
                        </>
                      ) : null}
                    </p>
                    {!somenteLeitura && (
                      <p className="text-xs text-muted-foreground">
                        Remarcações:{" "}
                        <span
                          className={cn(
                            "font-medium",
                            plano.creditos.disponiveis === 0 && "text-destructive",
                          )}
                        >
                          {plano.creditos.usados} de {plano.creditos.max}
                        </span>{" "}
                        neste mês
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge
                      variant="outline"
                      className={cn(
                        "gap-1",
                        dispBadge === 0 &&
                          "border-destructive/40 bg-destructive/10 text-destructive",
                      )}
                    >
                      <CalendarCheck className="size-3.5" />
                      {dispBadge == null
                        ? "livre"
                        : `${dispBadge} disponíve${dispBadge === 1 ? "l" : "is"}`}
                    </Badge>
                    {!somenteLeitura && gradeContexto && (
                      <GradeRecorrenteDialog
                        atribuicaoId={plano.atribuicaoId}
                        planoNome={plano.planoNome}
                        atendimentos={plano.atendimentos}
                        modalidades={
                          plano.tipos.filter(
                            (t): t is ModalidadePlano =>
                              t === "EDUCACAO_FISICA" || t === "FISIOTERAPIA",
                          )
                        }
                        linhasIniciais={
                          gradeContexto.linhasPorAtribuicao[plano.atribuicaoId] ?? []
                        }
                        opcoes={gradeContexto.opcoes}
                      />
                    )}
                  </div>
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
                              {ag.sala ? ` · ${ag.sala}` : ""}
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
                            <div className="flex flex-wrap items-center gap-1.5">
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
                              <RemarcarDialog
                                agendamento={{
                                  id: ag.id,
                                  titulo: ag.titulo,
                                  modalidade: ag.modalidade,
                                  profissionalId: ag.profissionalId,
                                  dataInicio: ag.dataInicio,
                                  dataFim: ag.dataFim,
                                  planoAtribuicaoId: ag.planoAtribuicaoId,
                                }}
                              />
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
          Cada agendamento consome 1 atendimento do plano — respeitando o limite do mês e o
          total do período. Use <span className="font-medium">Agendar</span> nos horários
          disponíveis; para trocar um horário já marcado, use{" "}
          <span className="font-medium">desmarcar</span> (até 2 horas antes) e agende de novo.
        </p>
      ) : (
        <p className="text-xs text-muted-foreground">
          Cada agendamento consome 1 atendimento do plano — respeitando o limite do mês e o
          total do período. Marque novos pelo botão{" "}
          <span className="font-medium">Agendar</span> aqui ou{" "}
          <span className="font-medium">Agendamentos</span> no topo.
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
  const [motivo, setMotivo] = useState("");
  const [pending, startPending] = useTransition();
  const dentroDoPrazo = pacientePodeDesmarcar(new Date(dataInicio));
  const motivoValido = motivo.trim().length >= 3;

  function confirmar() {
    setErro(undefined);
    startPending(async () => {
      const res = await desmarcarAgendamentoPeloPaciente(
        agendamentoId,
        pacienteId,
        motivo,
      );
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
        if (!next) {
          setErro(undefined);
          setMotivo("");
        }
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

        {dentroDoPrazo && (
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`motivo-${agendamentoId}`}>
              Por que você precisa desmarcar?
            </Label>
            <Textarea
              id={`motivo-${agendamentoId}`}
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              rows={3}
              placeholder="Descreva o motivo da remarcação"
            />
          </div>
        )}

        {erro && <p className="text-sm text-destructive">{erro}</p>}

        <DialogFooter className="flex justify-end gap-2">
          {dentroDoPrazo ? (
            <>
              <DialogClose asChild>
                <Button variant="outline" disabled={pending}>
                  Voltar
                </Button>
              </DialogClose>
              <Button
                variant="destructive"
                onClick={confirmar}
                disabled={pending || !motivoValido}
              >
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
