"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { NativeSelect } from "@/components/ui/native-select";
import { FormActions } from "@/components/ui/form-actions";
import {
  PacienteMultiSelect,
  type PacienteOption,
} from "@/components/pacientes/paciente-multi-select";
import {
  DIA_SEMANA_LABEL,
  REPETICAO_LABEL,
  MODALIDADE_AGENDAMENTO_LABEL,
} from "@/components/agendamentos/agendamento-labels";
import { MODALIDADE_SALA, temHorarioFixo } from "@/lib/salas";
import { cn } from "@/lib/utils";
import {
  getDisponibilidadeHorarios,
  type AgendamentoActionState,
} from "@/actions/agendamentos";

const initialState: AgendamentoActionState = {};

export const MODALIDADES_AGENDAMENTO = [
  { value: "FISIOTERAPIA", label: "Fisioterapia" },
  { value: "EDUCACAO_FISICA", label: "Educação Física" },
  { value: "AVALIACAO", label: "Avaliação" },
  { value: "TERAPIA_MANUAL", label: "Terapia Manual" },
] as const;

type Modalidade = (typeof MODALIDADES_AGENDAMENTO)[number]["value"];

function minutosParaHora(minutos: number) {
  const h = Math.floor(minutos / 60);
  const m = minutos % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function horaParaMinutos(hora: string) {
  const [h, m] = hora.split(":").map(Number);
  return h * 60 + m;
}

export const STATUS_AGENDAMENTO = [
  { value: "AGENDADO", label: "Agendado" },
  { value: "COMPARECEU", label: "Compareceu" },
  { value: "FALTOU", label: "Faltou" },
  { value: "CANCELADO", label: "Cancelado" },
];

const REPETICAO_OPTIONS = Object.entries(REPETICAO_LABEL);
const UNIDADE_OPTIONS = [
  { value: "DIA", label: "dia(s)" },
  { value: "SEMANA", label: "semana(s)" },
  { value: "MES", label: "mês(es)" },
  { value: "ANO", label: "ano(s)" },
];

export type AgendamentoFormDefaultValues = {
  titulo: string;
  pacienteIds: string[];
  profissionalId: string;
  data: string;
  horaInicio: string;
  horaFim: string;
  diaInteiro: boolean;
  modalidade: string;
  status: string;
  observacao: string;
};

export function AgendamentoForm({
  action,
  pacientes,
  profissionais,
  defaultValues,
  cancelHref,
  mode,
  agendamentoId,
}: {
  action: (
    prevState: AgendamentoActionState,
    formData: FormData,
  ) => Promise<AgendamentoActionState>;
  pacientes: PacienteOption[];
  profissionais: { id: string; name: string }[];
  defaultValues?: AgendamentoFormDefaultValues;
  cancelHref: string;
  mode: "create" | "edit";
  /** Necessário em edição para excluir o próprio evento da checagem de vagas do horário. */
  agendamentoId?: string;
}) {
  const router = useRouter();
  const [state, formAction] = useActionState(action, initialState);

  const [pacienteIds, setPacienteIds] = useState<string[]>(
    defaultValues?.pacienteIds ?? [],
  );
  const [diaInteiro, setDiaInteiro] = useState(defaultValues?.diaInteiro ?? false);
  const [modalidade, setModalidade] = useState<Modalidade>(
    (defaultValues?.modalidade as Modalidade) ?? "FISIOTERAPIA",
  );
  const [data, setData] = useState(defaultValues?.data ?? "");
  const [horaInicio, setHoraInicio] = useState(defaultValues?.horaInicio ?? "");
  const [slots, setSlots] = useState<
    { horario: string; duracaoMin: number; vagas: number; capacidade: number }[]
  >([]);
  const [repeticao, setRepeticao] = useState("NAO_REPETE");
  const [unidade, setUnidade] = useState("SEMANA");
  const [diasSemana, setDiasSemana] = useState<number[]>([]);
  const [termino, setTermino] = useState("NUNCA");

  useEffect(() => {
    if (state.success) {
      toast.success(
        mode === "create"
          ? "Evento criado com sucesso."
          : "Evento atualizado com sucesso.",
      );
      router.push(cancelHref);
    }
  }, [state.success, mode, cancelHref, router]);

  function toggleDiaSemana(dia: number) {
    setDiasSemana((prev) =>
      prev.includes(dia) ? prev.filter((d) => d !== dia) : [...prev, dia].sort(),
    );
  }

  useEffect(() => {
    if (diaInteiro || !temHorarioFixo(modalidade) || !data) return;
    let ativo = true;
    getDisponibilidadeHorarios(data, modalidade, agendamentoId).then((res) => {
      if (ativo) setSlots(res);
    });
    return () => {
      ativo = false;
    };
  }, [data, modalidade, diaInteiro, agendamentoId]);

  const horarioFixoVisivel = !diaInteiro && temHorarioFixo(modalidade);
  const slotsVisiveis = horarioFixoVisivel ? slots : [];

  const slotSelecionado = slots.find((s) => s.horario === horaInicio);
  const horaFimCalculada = slotSelecionado
    ? minutosParaHora(horaParaMinutos(horaInicio) + slotSelecionado.duracaoMin)
    : (defaultValues?.horaFim ?? "");

  return (
    <form action={formAction} className="flex max-w-2xl flex-col gap-4 pb-24">
      <input type="hidden" name="pacienteIds" value={JSON.stringify(pacienteIds)} />
      <input type="hidden" name="diasSemana" value={JSON.stringify(diasSemana)} />

      <div className="flex flex-col gap-2">
        <Label htmlFor="titulo">Nome do evento</Label>
        <Input
          id="titulo"
          name="titulo"
          defaultValue={defaultValues?.titulo}
          placeholder="Ex.: Sessão de fisioterapia"
          required
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label>Pacientes</Label>
        <PacienteMultiSelect
          options={pacientes}
          value={pacienteIds}
          onChange={setPacienteIds}
          placeholder="Selecionar pacientes (opcional)"
        />
      </div>

      <div className="flex flex-col gap-2 sm:max-w-xs">
        <Label htmlFor="profissionalId">Profissional</Label>
        <NativeSelect
          id="profissionalId"
          name="profissionalId"
          defaultValue={defaultValues?.profissionalId ?? ""}
        >
          <option value="">Sem profissional definido</option>
          {profissionais.map((profissional) => (
            <option key={profissional.id} value={profissional.id}>
              {profissional.name}
            </option>
          ))}
        </NativeSelect>
      </div>

      <div className="flex flex-col gap-2 sm:max-w-xs">
        <Label htmlFor="modalidade">Modalidade</Label>
        <NativeSelect
          id="modalidade"
          name="modalidade"
          value={modalidade}
          onChange={(e) => {
            setModalidade(e.target.value as Modalidade);
            setHoraInicio("");
          }}
        >
          {MODALIDADES_AGENDAMENTO.map((m) => (
            <option key={m.value} value={m.value}>
              {m.label}
            </option>
          ))}
        </NativeSelect>
        <p className="text-xs text-muted-foreground">
          {MODALIDADE_SALA[modalidade].sala} · até {MODALIDADE_SALA[modalidade].capacidade}{" "}
          pessoa(s) por horário
        </p>
      </div>

      <div className="flex items-center gap-2">
        <Checkbox
          id="diaInteiro"
          name="diaInteiro"
          checked={diaInteiro}
          onCheckedChange={(checked) => setDiaInteiro(checked === true)}
        />
        <Label htmlFor="diaInteiro" className="font-normal">
          Dia inteiro
        </Label>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="flex flex-col gap-2">
          <Label htmlFor="data">Data</Label>
          <Input
            id="data"
            name="data"
            type="date"
            value={data}
            onChange={(e) => setData(e.target.value)}
            required
          />
        </div>
        {!diaInteiro && !temHorarioFixo(modalidade) && (
          <>
            <div className="flex flex-col gap-2">
              <Label htmlFor="horaInicio">Início</Label>
              <Input
                id="horaInicio"
                name="horaInicio"
                type="time"
                value={horaInicio}
                onChange={(e) => setHoraInicio(e.target.value)}
                required
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="horaFim">Término</Label>
              <Input
                id="horaFim"
                name="horaFim"
                type="time"
                defaultValue={defaultValues?.horaFim}
                required
              />
            </div>
          </>
        )}
      </div>

      {!diaInteiro && temHorarioFixo(modalidade) && (
        <div className="flex flex-col gap-2">
          <Label>Horário</Label>
          <input type="hidden" name="horaInicio" value={horaInicio} required />
          <input type="hidden" name="horaFim" value={horaFimCalculada} required />
          {!data && (
            <p className="text-sm text-muted-foreground">
              Selecione uma data para ver os horários disponíveis.
            </p>
          )}
          {data && slotsVisiveis.length === 0 && (
            <p className="text-sm text-muted-foreground">
              Nenhum horário configurado para {MODALIDADE_AGENDAMENTO_LABEL[modalidade]}.
              Configure em Configurações.
            </p>
          )}
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
            {slotsVisiveis.map((slot) => {
              const selecionado = slot.horario === horaInicio;
              const cheio = slot.vagas <= 0 && !selecionado;
              return (
                <button
                  key={slot.horario}
                  type="button"
                  disabled={cheio}
                  onClick={() => setHoraInicio(slot.horario)}
                  aria-pressed={selecionado}
                  className={cn(
                    "flex flex-col items-center rounded-md border px-2 py-1.5 text-sm transition-colors",
                    cheio
                      ? "cursor-not-allowed border-transparent bg-muted text-muted-foreground line-through"
                      : "border-input hover:bg-muted/60",
                    selecionado &&
                      !cheio &&
                      "border-primary bg-primary text-primary-foreground hover:bg-primary",
                  )}
                >
                  {slot.horario}
                  <span className="text-[10px] opacity-80">
                    {slot.vagas}/{slot.capacidade} vagas
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {mode === "create" && (
        <div className="flex flex-col gap-2">
          <Label htmlFor="repeticao">Repetição</Label>
          <NativeSelect
            id="repeticao"
            name="repeticao"
            value={repeticao}
            onChange={(e) => setRepeticao(e.target.value)}
            className="sm:max-w-xs"
          >
            {REPETICAO_OPTIONS.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </NativeSelect>

          {repeticao === "PERSONALIZADA" && (
            <div className="flex flex-col gap-4 rounded-lg border p-4">
              <div className="flex items-center gap-2">
                <span className="text-sm">Repetir a cada</span>
                <Input
                  name="intervalo"
                  type="number"
                  min={1}
                  defaultValue={1}
                  className="w-20"
                />
                <NativeSelect
                  name="unidade"
                  value={unidade}
                  onChange={(e) => setUnidade(e.target.value)}
                  className="w-32"
                >
                  {UNIDADE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </NativeSelect>
              </div>

              {unidade === "SEMANA" && (
                <div className="flex flex-col gap-2">
                  <span className="text-xs text-muted-foreground">Repetir em</span>
                  <div className="flex gap-1">
                    {DIA_SEMANA_LABEL.map((label, dia) => (
                      <button
                        key={dia}
                        type="button"
                        onClick={() => toggleDiaSemana(dia)}
                        aria-pressed={diasSemana.includes(dia)}
                        className="flex size-8 items-center justify-center rounded-full border border-input text-xs font-medium transition-colors aria-pressed:border-primary aria-pressed:bg-primary aria-pressed:text-primary-foreground"
                      >
                        <span className="sr-only">Dia da semana {dia}</span>
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex flex-col gap-2">
                <span className="text-xs text-muted-foreground">Termina</span>
                <div className="flex flex-col gap-2">
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="radio"
                      name="termino"
                      value="NUNCA"
                      checked={termino === "NUNCA"}
                      onChange={() => setTermino("NUNCA")}
                    />
                    Nunca
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="radio"
                      name="termino"
                      value="EM_DATA"
                      checked={termino === "EM_DATA"}
                      onChange={() => setTermino("EM_DATA")}
                    />
                    Em
                    <Input
                      type="date"
                      name="terminoData"
                      disabled={termino !== "EM_DATA"}
                      className="w-auto"
                      onFocus={() => setTermino("EM_DATA")}
                    />
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="radio"
                      name="termino"
                      value="APOS_N"
                      checked={termino === "APOS_N"}
                      onChange={() => setTermino("APOS_N")}
                    />
                    Após
                    <Input
                      type="number"
                      min={1}
                      name="terminoOcorrencias"
                      disabled={termino !== "APOS_N"}
                      className="w-20"
                      onFocus={() => setTermino("APOS_N")}
                    />
                    ocorrências
                  </label>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="flex flex-col gap-2 sm:max-w-xs">
        <Label htmlFor="status">Status</Label>
        <NativeSelect id="status" name="status" defaultValue={defaultValues?.status ?? "AGENDADO"}>
          {STATUS_AGENDAMENTO.map((status) => (
            <option key={status.value} value={status.value}>
              {status.label}
            </option>
          ))}
        </NativeSelect>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="observacao">Observação</Label>
        <Textarea
          id="observacao"
          name="observacao"
          rows={3}
          defaultValue={defaultValues?.observacao}
        />
      </div>

      {state.error && <p className="text-sm text-destructive">{state.error}</p>}

      <FormActions
        submitLabel={mode === "create" ? "Criar evento" : "Salvar alterações"}
        onCancel={() => router.push(cancelHref)}
      />
    </form>
  );
}
