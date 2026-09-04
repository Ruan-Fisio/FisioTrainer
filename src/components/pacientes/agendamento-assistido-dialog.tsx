"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { format, startOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { CalendarPlus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
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
import { CalendarioDisponibilidade } from "@/components/agendamentos/calendario-disponibilidade";
import { GradeHorariosDisponiveis } from "@/components/agendamentos/grade-horarios-disponiveis";
import { MODALIDADE_AGENDAMENTO_LABEL } from "@/components/agendamentos/agendamento-labels";
import {
  criarAgendamentoAssistido,
  getDadosAgendamentoAssistido,
  getDisponibilidadeHorarios,
  getDisponibilidadeMesAssistido,
} from "@/actions/agendamentos";
import type { ModalidadeAgendamento } from "@/generated/prisma/enums";

type Opcao = {
  atribuicaoId: string;
  planoNome: string;
  modalidade: ModalidadeAgendamento;
  atendimentos: number | null;
  sala: string;
};
type Profissional = { id: string; name: string | null };
type Slot = { horario: string; duracaoMin: number; vagas: number; capacidade: number };

export function AgendamentoAssistidoDialog({
  pacienteId,
  label = "Agendamentos",
  size = "default",
}: {
  pacienteId: string;
  label?: string;
  size?: "default" | "sm";
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<1 | 2 | 3>(1);

  const [carregandoDados, startDados] = useTransition();
  const [opcoes, setOpcoes] = useState<Opcao[] | null>(null);
  const [profissionais, setProfissionais] = useState<Profissional[]>([]);

  const [opcaoIdx, setOpcaoIdx] = useState<number | null>(null);
  const [profissionalId, setProfissionalId] = useState("");

  const [mesRef, setMesRef] = useState(() => startOfMonth(new Date()));
  const [dispMes, setDispMes] = useState<Awaited<
    ReturnType<typeof getDisponibilidadeMesAssistido>
  > | null>(null);
  const [carregandoMes, startMes] = useTransition();

  const [diaSelecionado, setDiaSelecionado] = useState<string | null>(null);
  const [slots, setSlots] = useState<Slot[] | null>(null);
  const [carregandoSlots, startSlots] = useTransition();
  const [horaSelecionada, setHoraSelecionada] = useState<string | null>(null);

  const [erro, setErro] = useState<string>();
  const [isPending, startTransition] = useTransition();

  const opcao = opcaoIdx != null ? (opcoes?.[opcaoIdx] ?? null) : null;

  function resetar() {
    setStep(1);
    setOpcaoIdx(null);
    setProfissionalId("");
    setMesRef(startOfMonth(new Date()));
    setDispMes(null);
    setDiaSelecionado(null);
    setSlots(null);
    setHoraSelecionada(null);
    setErro(undefined);
  }

  function onOpenChange(next: boolean) {
    setOpen(next);
    if (!next) resetar();
  }

  // Carrega planos ativos + profissionais ao abrir
  useEffect(() => {
    if (!open || opcoes != null) return;
    startDados(async () => {
      const res = await getDadosAgendamentoAssistido(pacienteId);
      setOpcoes(res.opcoes);
      setProfissionais(res.profissionais);
    });
  }, [open, opcoes, pacienteId]);

  // Carrega disponibilidade do mês no passo 2
  useEffect(() => {
    if (step !== 2 || !opcao) return;
    startMes(async () => {
      const res = await getDisponibilidadeMesAssistido({
        modalidade: opcao.modalidade,
        ano: mesRef.getFullYear(),
        mes: mesRef.getMonth() + 1,
        planoAtribuicaoId: opcao.atribuicaoId,
        atendimentos: opcao.atendimentos,
      });
      setDispMes(res);
    });
  }, [step, opcao, mesRef]);

  // Carrega horários do dia no passo 3
  useEffect(() => {
    if (step !== 3 || !diaSelecionado || !opcao) return;
    startSlots(async () => {
      const res = await getDisponibilidadeHorarios(diaSelecionado, opcao.modalidade);
      setSlots(res);
    });
  }, [step, diaSelecionado, opcao]);

  function confirmar() {
    if (!opcao || !diaSelecionado || !horaSelecionada) return;
    setErro(undefined);
    startTransition(async () => {
      const res = await criarAgendamentoAssistido({
        pacienteId,
        planoAtribuicaoId: opcao.atribuicaoId,
        profissionalId,
        modalidade: opcao.modalidade,
        data: diaSelecionado,
        horario: horaSelecionada,
      });
      if (res.error) {
        setErro(res.error);
        return;
      }
      toast.success("Agendamento criado com sucesso.");
      onOpenChange(false);
      router.refresh();
    });
  }

  const resumo = opcao
    ? `${opcao.planoNome} · ${MODALIDADE_AGENDAMENTO_LABEL[opcao.modalidade]} · ${opcao.sala}`
    : "";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" size={size}>
          <CalendarPlus />
          {label}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Agendar pelo plano</DialogTitle>
          <DialogDescription>
            {step === 1 && "Passo 1 de 3 — escolha o plano e o profissional."}
            {step === 2 && "Passo 2 de 3 — escolha o dia."}
            {step === 3 && "Passo 3 de 3 — escolha o horário."}
          </DialogDescription>
        </DialogHeader>

        {step > 1 && resumo && (
          <p className="rounded-md bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
            {resumo}
          </p>
        )}

        {/* ---------------- Passo 1 ---------------- */}
        {step === 1 && (
          <div className="flex flex-col gap-4">
            {carregandoDados && (
              <p className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
                <Loader2 className="size-4 animate-spin" /> Carregando planos…
              </p>
            )}

            {!carregandoDados && opcoes && opcoes.length === 0 && (
              <p className="py-6 text-center text-sm text-muted-foreground">
                Este paciente não tem plano ativo. Atribua um plano na aba{" "}
                <span className="font-medium">Planos</span> primeiro.
              </p>
            )}

            {!carregandoDados && opcoes && opcoes.length > 0 && (
              <>
                <div className="flex flex-col gap-2">
                  <Label>Plano</Label>
                  <div className="flex flex-col gap-2">
                    {opcoes.map((o, i) => {
                      const ativo = opcaoIdx === i;
                      return (
                        <button
                          key={`${o.atribuicaoId}-${o.modalidade}`}
                          type="button"
                          onClick={() => setOpcaoIdx(i)}
                          className={cn(
                            "flex flex-col items-start gap-0.5 rounded-lg border px-3 py-2 text-left text-sm transition-colors",
                            ativo
                              ? "border-primary bg-primary/5 ring-1 ring-primary"
                              : "border-input hover:bg-muted/50",
                          )}
                        >
                          <span className="font-medium">{o.planoNome}</span>
                          <span className="text-xs text-muted-foreground">
                            {MODALIDADE_AGENDAMENTO_LABEL[o.modalidade]} · {o.sala}
                            {o.atendimentos != null
                              ? ` · ${o.atendimentos}x/mês`
                              : ""}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <Label htmlFor="assistido-profissional">Profissional</Label>
                  <NativeSelect
                    id="assistido-profissional"
                    value={profissionalId}
                    onChange={(e) => setProfissionalId(e.target.value)}
                  >
                    <option value="">Selecione…</option>
                    {profissionais.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name ?? "Sem nome"}
                      </option>
                    ))}
                  </NativeSelect>
                </div>
              </>
            )}
          </div>
        )}

        {/* ---------------- Passo 2 ---------------- */}
        {step === 2 && (
          <div className="flex flex-col gap-3">
            {dispMes?.limiteAtingido && (
              <p className="rounded-md bg-destructive/10 px-3 py-2 text-xs text-destructive">
                Limite de {dispMes.limiteMes} agendamento(s) deste plano já atingido
                neste mês ({dispMes.usadosNoMes}/{dispMes.limiteMes}).
              </p>
            )}
            <CalendarioDisponibilidade
              mesRef={mesRef}
              onMesChange={setMesRef}
              dias={dispMes?.dias ?? null}
              carregando={carregandoMes}
              diaSelecionado={diaSelecionado}
              bloqueado={dispMes?.limiteAtingido ?? false}
              onSelecionarDia={(d) => {
                setDiaSelecionado(d);
                setHoraSelecionada(null);
                setSlots(null);
                setErro(undefined);
                setStep(3);
              }}
            />
          </div>
        )}

        {/* ---------------- Passo 3 ---------------- */}
        {step === 3 && (
          <div className="flex flex-col gap-3">
            <p className="text-sm font-medium capitalize">
              {diaSelecionado &&
                format(new Date(`${diaSelecionado}T12:00:00`), "EEEE, d 'de' MMMM", {
                  locale: ptBR,
                })}
            </p>
            <GradeHorariosDisponiveis
              slots={slots}
              carregando={carregandoSlots}
              horaSelecionada={horaSelecionada}
              onSelecionar={(h) => {
                setHoraSelecionada(h);
                setErro(undefined);
              }}
              vazioLabel="Nenhum horário configurado para esta modalidade."
            />
            {erro && <p className="text-sm text-destructive">{erro}</p>}
          </div>
        )}

        <DialogFooter className="sm:justify-between">
          <Button
            variant="outline"
            onClick={() => {
              setErro(undefined);
              if (step === 1) onOpenChange(false);
              else setStep((s) => (s - 1) as 1 | 2 | 3);
            }}
            disabled={isPending}
          >
            {step === 1 ? "Cancelar" : "Voltar"}
          </Button>

          {step === 1 && (
            <Button
              onClick={() => setStep(2)}
              disabled={opcaoIdx == null || !profissionalId}
            >
              Continuar
            </Button>
          )}
          {step === 3 && (
            <Button onClick={confirmar} disabled={!horaSelecionada || isPending}>
              {isPending ? "Agendando…" : "Confirmar agendamento"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
