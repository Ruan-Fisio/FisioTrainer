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
import {
  CalendarioDisponibilidade,
  type DiaDisp,
} from "@/components/agendamentos/calendario-disponibilidade";
import { GradeHorariosDisponiveis } from "@/components/agendamentos/grade-horarios-disponiveis";
import { DURACAO_HORARIO_LIVRE_MIN } from "@/lib/salas";
import { toDateInputValue } from "@/lib/format";
import { combinarDataHora } from "@/lib/validations/agendamento";
import {
  criarAgendamentoServico,
  getAgendamentosDoDia,
  getDisponibilidadeMes,
} from "@/actions/agendamentos";
import { getProfissionaisServico } from "@/actions/servicos";
import type { listAllServicos } from "@/actions/servicos";

type Servico = Awaited<ReturnType<typeof listAllServicos>>[number];
type Profissional = { id: string; name: string | null };
type Slot = { horario: string; vagas: number; capacidade: number };

const INICIO_EXPEDIENTE = 7 * 60;
const FIM_EXPEDIENTE = 21 * 60;
const PASSO_MINUTOS = 30;

function minutosParaHora(minutos: number) {
  const h = Math.floor(minutos / 60);
  const m = minutos % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function horaParaMinutos(hora: string) {
  const [h, m] = hora.split(":").map(Number);
  return h * 60 + m;
}

/**
 * Wizard de 3 passos, mesmo padrão do `AgendamentoAssistidoDialog`: 1) serviço +
 * profissional, 2) dia (calendário de disponibilidade), 3) horário. Diferente do
 * wizard de plano, aqui não há grade fixa nem orçamento — o passo 3 gera uma grade
 * de horário livre (30 em 30 min, duração `DURACAO_HORARIO_LIVRE_MIN`) filtrada só
 * por conflito do profissional, igual ao passo de horário livre da remarcação
 * (`remarcar-conteudo.tsx`, usado por Avaliação/Terapia Manual). Capacidade de sala
 * (quando o serviço tem `SalaServico` configurada) é resolvida no servidor ao
 * confirmar (`criarAgendamentoServico` → `resolverSalaServico`).
 */
export function AgendamentoServicoDialog({
  pacienteId,
  servicos,
}: {
  pacienteId: string;
  servicos: Servico[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<1 | 2 | 3>(1);

  const [servicoId, setServicoId] = useState("");
  const [profissionalId, setProfissionalId] = useState("");
  const [profissionais, setProfissionais] = useState<Profissional[]>([]);
  const [carregandoProfissionais, startProfissionais] = useTransition();

  const [mesRef, setMesRef] = useState(() => startOfMonth(new Date()));
  const [dias, setDias] = useState<DiaDisp[] | null>(null);
  const [carregandoMes, startMes] = useTransition();

  const [diaSelecionado, setDiaSelecionado] = useState<string | null>(null);
  const [slots, setSlots] = useState<Slot[] | null>(null);
  const [carregandoSlots, startSlots] = useTransition();
  const [horaSelecionada, setHoraSelecionada] = useState<string | null>(null);

  const [erro, setErro] = useState<string>();
  const [isPending, startTransition] = useTransition();

  const servico = servicos.find((s) => s.id === servicoId) ?? null;
  const profissional = profissionais.find((p) => p.id === profissionalId) ?? null;

  function resetar() {
    setStep(1);
    setServicoId("");
    setProfissionalId("");
    setProfissionais([]);
    setMesRef(startOfMonth(new Date()));
    setDias(null);
    setDiaSelecionado(null);
    setSlots(null);
    setHoraSelecionada(null);
    setErro(undefined);
  }

  function onOpenChange(next: boolean) {
    setOpen(next);
    if (!next) resetar();
  }

  // Profissionais habilitados mudam a cada serviço escolhido.
  useEffect(() => {
    if (!servicoId) {
      setProfissionais([]);
      setProfissionalId("");
      return;
    }
    startProfissionais(async () => {
      const res = await getProfissionaisServico(servicoId);
      setProfissionais(res);
      setProfissionalId("");
    });
  }, [servicoId]);

  // Passo 2 — disponibilidade do mês. Serviço é sempre horário livre (sem grade
  // fixa): todo dia em que a clínica está aberta fica disponível, o passo 3 filtra
  // por conflito do profissional.
  useEffect(() => {
    if (step !== 2) return;
    startMes(async () => {
      const res = await getDisponibilidadeMes({
        modalidade: "OUTRO",
        ano: mesRef.getFullYear(),
        mes: mesRef.getMonth() + 1,
      });
      setDias(res.dias);
    });
  }, [step, mesRef]);

  // Passo 3 — grade de 30 em 30 min do dia, filtrada só por conflito do profissional.
  useEffect(() => {
    if (step !== 3 || !diaSelecionado || !profissionalId) return;
    startSlots(async () => {
      const ocupados = await getAgendamentosDoDia(diaSelecionado, profissionalId);
      const agora = new Date();
      const ehHoje = diaSelecionado === toDateInputValue(agora);
      const lista: Slot[] = [];
      for (
        let minutos = INICIO_EXPEDIENTE;
        minutos + DURACAO_HORARIO_LIVRE_MIN <= FIM_EXPEDIENTE;
        minutos += PASSO_MINUTOS
      ) {
        const horario = minutosParaHora(minutos);
        const inicioSlot = combinarDataHora(diaSelecionado, horario);
        const fimSlot = new Date(inicioSlot.getTime() + DURACAO_HORARIO_LIVRE_MIN * 60000);
        const ocupado = ocupados.some((e) => inicioSlot < e.dataFim && fimSlot > e.dataInicio);
        const passado = ehHoje && inicioSlot < agora;
        lista.push({ horario, vagas: ocupado || passado ? 0 : 1, capacidade: 1 });
      }
      setSlots(lista);
    });
  }, [step, diaSelecionado, profissionalId]);

  function confirmar() {
    if (!diaSelecionado || !horaSelecionada) return;
    const horaFim = minutosParaHora(
      horaParaMinutos(horaSelecionada) + DURACAO_HORARIO_LIVRE_MIN,
    );
    setErro(undefined);
    startTransition(async () => {
      const res = await criarAgendamentoServico({
        pacienteId,
        servicoId,
        profissionalId,
        data: diaSelecionado,
        horaInicio: horaSelecionada,
        horaFim,
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

  const resumo = servico
    ? `${servico.nome}${profissional ? ` · ${profissional.name ?? "Sem nome"}` : ""}`
    : "";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <CalendarPlus />
          Novo agendamento de serviço
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Agendar serviço</DialogTitle>
          <DialogDescription>
            {step === 1 && "Passo 1 de 3 — escolha o serviço e o profissional."}
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
            <div className="flex flex-col gap-2">
              <Label htmlFor="servico-servico">Serviço</Label>
              <NativeSelect
                id="servico-servico"
                value={servicoId}
                onChange={(e) => setServicoId(e.target.value)}
              >
                <option value="">Selecione…</option>
                {servicos.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.nome}
                  </option>
                ))}
              </NativeSelect>
              {servicos.length === 0 && (
                <p className="text-xs text-muted-foreground">
                  Nenhum serviço cadastrado ainda. Cadastre em Serviços.
                </p>
              )}
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="servico-profissional">Profissional</Label>
              <NativeSelect
                id="servico-profissional"
                value={profissionalId}
                onChange={(e) => setProfissionalId(e.target.value)}
                disabled={!servicoId || carregandoProfissionais}
              >
                <option value="">
                  {!servicoId
                    ? "Escolha o serviço primeiro"
                    : carregandoProfissionais
                      ? "Carregando…"
                      : "Selecione…"}
                </option>
                {profissionais.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name ?? "Sem nome"}
                  </option>
                ))}
              </NativeSelect>
              {servicoId && !carregandoProfissionais && profissionais.length === 0 && (
                <p className="text-xs text-muted-foreground">
                  Nenhum usuário cadastrado ainda.
                </p>
              )}
            </div>
          </div>
        )}

        {/* ---------------- Passo 2 ---------------- */}
        {step === 2 && (
          <CalendarioDisponibilidade
            mesRef={mesRef}
            onMesChange={setMesRef}
            dias={dias}
            carregando={carregandoMes}
            diaSelecionado={diaSelecionado}
            onSelecionarDia={(d) => {
              setDiaSelecionado(d);
              setHoraSelecionada(null);
              setSlots(null);
              setErro(undefined);
              setStep(3);
            }}
          />
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
              vazioLabel="Nenhum horário disponível."
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
            <Button onClick={() => setStep(2)} disabled={!servicoId || !profissionalId}>
              Continuar
            </Button>
          )}
          {step === 3 && (
            <Button onClick={confirmar} disabled={!horaSelecionada || isPending}>
              {isPending ? (
                <>
                  <Loader2 className="size-4 animate-spin" /> Agendando…
                </>
              ) : (
                "Confirmar agendamento"
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
