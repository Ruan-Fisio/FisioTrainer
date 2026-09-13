"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { format, startOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { temHorarioFixo } from "@/lib/salas";
import {
  getAgendamentosDoDia,
  getDisponibilidadeHorarios,
  getDisponibilidadeMes,
  remarcarAgendamento,
} from "@/actions/agendamentos";
import {
  CalendarioDisponibilidade,
  type DiaDisp,
} from "@/components/agendamentos/calendario-disponibilidade";
import { GradeHorariosDisponiveis } from "@/components/agendamentos/grade-horarios-disponiveis";
import type { ModalidadeAgendamento } from "@/generated/prisma/enums";

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

export type RemarcarAlvo = {
  id: string;
  titulo: string;
  modalidade: ModalidadeAgendamento;
  profissionalId: string | null;
  dataInicio: Date;
  dataFim: Date;
  /** Preenchido quando o evento veio de um plano: exige justificativa e consome 1 crédito de remarcação. */
  planoAtribuicaoId: string | null;
};

type SlotInterno = { horario: string; vagas: number; capacidade: number; duracaoMin: number };

/**
 * Wizard de remarcação (sem Dialog): passo 1 escolhe o dia num calendário que
 * destaca disponibilidade (azul/vermelho), passo 2 escolhe o horário livre da
 * modalidade do evento. Usado no `RemarcarDialog` (aba Agendamentos do paciente /
 * dashboard). A agenda é só leitura e não remarca.
 */
export function RemarcarConteudo({
  agendamento,
  onCancel,
  onSuccess,
  cancelLabel = "Cancelar",
}: {
  agendamento: RemarcarAlvo;
  onCancel: () => void;
  onSuccess: () => void;
  cancelLabel?: string;
}) {
  const [passo, setPasso] = useState<"dia" | "horario">("dia");
  const [mesRef, setMesRef] = useState(() => startOfMonth(agendamento.dataInicio));
  const [dias, setDias] = useState<DiaDisp[] | null>(null);
  const [carregandoMes, startMes] = useTransition();

  const [dia, setDia] = useState<string | null>(null);
  const [slots, setSlots] = useState<SlotInterno[] | null>(null);
  const [carregandoSlots, startSlots] = useTransition();
  const [hora, setHora] = useState<string | null>(null);

  const [erro, setErro] = useState<string>();
  const [isPending, startTransition] = useTransition();

  const exigeJustificativa = agendamento.planoAtribuicaoId != null;
  const [justificativa, setJustificativa] = useState("");
  const [confirmarSemCredito, setConfirmarSemCredito] = useState(false);
  const justificativaValida = !exigeJustificativa || justificativa.trim().length >= 3;

  const duracaoMinEvento = Math.round(
    (agendamento.dataFim.getTime() - agendamento.dataInicio.getTime()) / 60000,
  );

  // Passo 1 — disponibilidade do mês
  useEffect(() => {
    if (passo !== "dia") return;
    startMes(async () => {
      const res = await getDisponibilidadeMes({
        modalidade: agendamento.modalidade,
        ano: mesRef.getFullYear(),
        mes: mesRef.getMonth() + 1,
        excludeId: agendamento.id,
        planoAtribuicaoId: agendamento.planoAtribuicaoId ?? undefined,
      });
      setDias(res.dias);
    });
  }, [passo, mesRef, agendamento.modalidade, agendamento.id, agendamento.planoAtribuicaoId]);

  // Passo 2 — horários do dia
  useEffect(() => {
    if (passo !== "horario" || !dia) return;
    startSlots(async () => {
      if (temHorarioFixo(agendamento.modalidade)) {
        const res = await getDisponibilidadeHorarios(
          dia,
          agendamento.modalidade,
          agendamento.id,
          agendamento.planoAtribuicaoId ?? undefined,
        );
        setSlots(res.map((s) => ({ ...s })));
        return;
      }
      // Horário livre: grade de 30 min filtrada por conflito do profissional.
      const ocupados = await getAgendamentosDoDia(dia, agendamento.profissionalId, agendamento.id);
      const agora = new Date();
      const ehHoje = dia === format(agora, "yyyy-MM-dd");
      const lista: SlotInterno[] = [];
      for (
        let minutos = INICIO_EXPEDIENTE;
        minutos + duracaoMinEvento <= FIM_EXPEDIENTE;
        minutos += PASSO_MINUTOS
      ) {
        const horario = minutosParaHora(minutos);
        const inicioSlot = new Date(`${dia}T${horario}:00`);
        const fimSlot = new Date(inicioSlot.getTime() + duracaoMinEvento * 60000);
        const ocupado = ocupados.some((e) => inicioSlot < e.dataFim && fimSlot > e.dataInicio);
        const passado = ehHoje && inicioSlot < agora;
        lista.push({
          horario,
          vagas: ocupado || passado ? 0 : 1,
          capacidade: 1,
          duracaoMin: duracaoMinEvento,
        });
      }
      setSlots(lista);
    });
  }, [
    passo,
    dia,
    agendamento.modalidade,
    agendamento.id,
    agendamento.profissionalId,
    agendamento.planoAtribuicaoId,
    duracaoMinEvento,
  ]);

  const slotSelecionado = useMemo(
    () => slots?.find((s) => s.horario === hora) ?? null,
    [slots, hora],
  );

  function confirmar(forcar = false) {
    if (!dia || !hora || !slotSelecionado) return;
    const horaFim = minutosParaHora(horaParaMinutos(hora) + slotSelecionado.duracaoMin);
    setErro(undefined);
    startTransition(async () => {
      const res = await remarcarAgendamento(
        agendamento.id,
        dia,
        hora,
        horaFim,
        justificativa,
        forcar,
      );
      if (res.requiresConfirmacao) {
        setConfirmarSemCredito(true);
        return;
      }
      if (res.error) {
        setErro(res.error);
        return;
      }
      toast.success("Atendimento remarcado com sucesso.");
      onSuccess();
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-xs text-muted-foreground">
        {passo === "dia" ? "Passo 1 de 2 — escolha o novo dia." : "Passo 2 de 2 — escolha o horário."}
      </p>

      {passo === "dia" && (
        <CalendarioDisponibilidade
          mesRef={mesRef}
          onMesChange={setMesRef}
          dias={dias}
          carregando={carregandoMes}
          diaSelecionado={dia}
          onSelecionarDia={(d) => {
            setDia(d);
            setHora(null);
            setSlots(null);
            setErro(undefined);
            setPasso("horario");
          }}
        />
      )}

      {passo === "horario" && (
        <div className="flex flex-col gap-3">
          <p className="text-sm font-medium capitalize">
            {dia &&
              format(new Date(`${dia}T12:00:00`), "EEEE, d 'de' MMMM", { locale: ptBR })}
          </p>
          <GradeHorariosDisponiveis
            slots={slots}
            carregando={carregandoSlots}
            horaSelecionada={hora}
            onSelecionar={(h) => {
              setHora(h);
              setErro(undefined);
            }}
            vazioLabel="Nenhum horário configurado para esta modalidade."
          />

          {exigeJustificativa && (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="justificativa-remarcacao">
                Justificativa da remarcação
              </Label>
              <Textarea
                id="justificativa-remarcacao"
                value={justificativa}
                onChange={(e) => {
                  setJustificativa(e.target.value);
                  setConfirmarSemCredito(false);
                }}
                rows={3}
                placeholder="Por que este atendimento está sendo remarcado?"
              />
            </div>
          )}

          {confirmarSemCredito && (
            <div className="flex flex-col gap-2 rounded-lg border border-destructive/40 bg-destructive/10 p-3">
              <p className="text-sm text-destructive">
                Este plano está sem créditos de remarcação neste mês. Remarcar mesmo
                assim?
              </p>
              <Button
                variant="destructive"
                size="sm"
                className="self-start"
                onClick={() => confirmar(true)}
                disabled={isPending}
              >
                {isPending ? "Remarcando..." : "Remarcar assim mesmo"}
              </Button>
            </div>
          )}

          {erro && <p className="text-sm text-destructive">{erro}</p>}
        </div>
      )}

      <div className="-mx-4 -mb-4 flex flex-col-reverse gap-2 rounded-b-xl border-t bg-muted/50 p-4 sm:flex-row sm:justify-end">
        <Button
          variant="outline"
          onClick={() => {
            setErro(undefined);
            if (passo === "dia") onCancel();
            else setPasso("dia");
          }}
          disabled={isPending}
        >
          {passo === "dia" ? cancelLabel : "Voltar"}
        </Button>
        {passo === "horario" && !confirmarSemCredito && (
          <Button
            onClick={() => confirmar(false)}
            disabled={!hora || isPending || !justificativaValida}
          >
            {isPending ? "Remarcando..." : "Confirmar novo horário"}
          </Button>
        )}
      </div>
    </div>
  );
}
