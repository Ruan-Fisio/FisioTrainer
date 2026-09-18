"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { format, startOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { CalendarPlus, Loader2, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Card, CardContent } from "@/components/ui/card";
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
import { formatarData, formatarMoeda, toDateInputValue } from "@/lib/format";
import { combinarDataHora } from "@/lib/validations/agendamento";
import {
  gerarDatasVencimento,
  gerarValoresParcelas,
  maxParcelasPlano,
  type FormaPagamentoPlano,
} from "@/lib/planos";
import {
  formaPagamentoPlanoLabels,
  formaPagamentoPlanoValues,
} from "@/lib/validations/plano";
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
 * Wizard de 4 passos, mesmo padrão do `AgendamentoAssistidoDialog`: 1) serviço +
 * profissional (valor pré-preenchido com `Servico.valorPadrao`, editável), 2) dia
 * (calendário de disponibilidade), 3) horário, 4) pagamento. Diferente do wizard de
 * plano, aqui não há grade fixa nem orçamento — o passo 3 gera uma grade de horário
 * livre (30 em 30 min, duração `DURACAO_HORARIO_LIVRE_MIN`) filtrada só por conflito
 * do profissional, igual ao passo de horário livre da remarcação
 * (`remarcar-conteudo.tsx`, usado por Avaliação/Terapia Manual). Capacidade de sala
 * (quando o serviço tem `SalaServico` configurada) é resolvida no servidor ao
 * confirmar (`criarAgendamentoServico` → `resolverSalaServico`). O passo 4 espelha a
 * seção de pagamento de `plano-atribuicao-form.tsx` (forma de pagamento, parcelas
 * geradas via `gerarDatasVencimento`) — nota fiscal já vem sempre inclusa no valor,
 * sem toggle, igual ao Plano. O servidor cria a `Cobranca` de cada parcela na mesma
 * transação do agendamento.
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
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);

  const [servicoId, setServicoId] = useState("");
  const [profissionalId, setProfissionalId] = useState("");
  const [profissionais, setProfissionais] = useState<Profissional[]>([]);
  const [carregandoProfissionais, startProfissionais] = useTransition();
  const [valor, setValor] = useState("");

  const [mesRef, setMesRef] = useState(() => startOfMonth(new Date()));
  const [dias, setDias] = useState<DiaDisp[] | null>(null);
  const [carregandoMes, startMes] = useTransition();

  const [diaSelecionado, setDiaSelecionado] = useState<string | null>(null);
  const [slots, setSlots] = useState<Slot[] | null>(null);
  const [carregandoSlots, startSlots] = useTransition();
  const [horaSelecionada, setHoraSelecionada] = useState<string | null>(null);

  const [formaPagamento, setFormaPagamento] = useState<FormaPagamentoPlano>("A_VISTA");
  const [vencimentos, setVencimentos] = useState<string[]>([""]);
  const [parcelasGeradas, setParcelasGeradas] = useState(false);
  const [wizardPrimeiraData, setWizardPrimeiraData] = useState("");
  const [wizardQuantidade, setWizardQuantidade] = useState("1");

  const [erro, setErro] = useState<string>();
  const [isPending, startTransition] = useTransition();

  const servico = servicos.find((s) => s.id === servicoId) ?? null;
  const profissional = profissionais.find((p) => p.id === profissionalId) ?? null;

  const maxParcelas = maxParcelasPlano("TRIMESTRAL", formaPagamento);
  const valorNumero = Number(valor.replace(/\./g, "").replace(",", ".")) || 0;

  const preview = useMemo(() => {
    const datasValidas = vencimentos.filter(Boolean);
    if (datasValidas.length === 0 || !valorNumero) return [];
    const datasOrdenadas = [...datasValidas].sort();
    const valores = gerarValoresParcelas(valorNumero, datasOrdenadas.length);
    return datasOrdenadas.map((data, i) => ({
      data: new Date(`${data}T12:00:00`),
      valor: valores[i],
    }));
  }, [vencimentos, valorNumero]);

  function resetar() {
    setStep(1);
    setServicoId("");
    setProfissionalId("");
    setProfissionais([]);
    setValor("");
    setMesRef(startOfMonth(new Date()));
    setDias(null);
    setDiaSelecionado(null);
    setSlots(null);
    setHoraSelecionada(null);
    setFormaPagamento("A_VISTA");
    setVencimentos([""]);
    setParcelasGeradas(false);
    setWizardPrimeiraData("");
    setWizardQuantidade("1");
    setErro(undefined);
  }

  function onOpenChange(next: boolean) {
    setOpen(next);
    if (!next) resetar();
  }

  // Profissionais habilitados mudam a cada serviço escolhido; valor vem pré-preenchido
  // do cadastro do serviço (Servico.valorPadrao), mas continua editável.
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

  // Valor vem pré-preenchido do cadastro do serviço (Servico.valorPadrao), editável.
  useEffect(() => {
    if (servico) setValor(servico.valorPadrao.toFixed(2).replace(".", ","));
  }, [servico]);

  useEffect(() => {
    setVencimentos((prev) => (prev.length > maxParcelas ? prev.slice(0, maxParcelas) : prev));
    setWizardQuantidade((prev) => (Number(prev) > maxParcelas ? String(maxParcelas) : prev));
  }, [maxParcelas]);

  function handleGerarParcelas() {
    const quantidade = Math.min(Number(wizardQuantidade), maxParcelas);
    if (!wizardPrimeiraData || !quantidade || quantidade < 1) return;
    setVencimentos(gerarDatasVencimento(wizardPrimeiraData, quantidade));
    setParcelasGeradas(true);
  }

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
    const vencimentosValidos = vencimentos.filter(Boolean);
    if (vencimentosValidos.length === 0) return;
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
        valor: valorNumero,
        formaPagamento,
        vencimentos: vencimentosValidos,
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
            {step === 1 && "Passo 1 de 4 — escolha o serviço e o profissional."}
            {step === 2 && "Passo 2 de 4 — escolha o dia."}
            {step === 3 && "Passo 3 de 4 — escolha o horário."}
            {step === 4 && "Passo 4 de 4 — pagamento."}
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

            <div className="flex flex-col gap-2">
              <Label htmlFor="servico-valor">Valor (R$)</Label>
              <Input
                id="servico-valor"
                inputMode="decimal"
                value={valor}
                onChange={(e) => setValor(e.target.value)}
                placeholder="150,00"
              />
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

        {/* ---------------- Passo 4 ---------------- */}
        {step === 4 && (
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label>Forma de pagamento</Label>
              <RadioGroup
                value={formaPagamento}
                onValueChange={(v) => setFormaPagamento(v as FormaPagamentoPlano)}
                className="flex flex-col gap-2"
              >
                {formaPagamentoPlanoValues.map((forma) => (
                  <label
                    key={forma}
                    className="flex min-h-8 cursor-pointer items-center gap-2 rounded-lg border border-input p-2 text-sm select-none"
                  >
                    <RadioGroupItem value={forma} />
                    {forma === "ATE_3X_CARTAO"
                      ? `Até ${maxParcelasPlano("TRIMESTRAL", "ATE_3X_CARTAO")}x no cartão`
                      : formaPagamentoPlanoLabels[forma]}
                  </label>
                ))}
              </RadioGroup>
            </div>

            {!parcelasGeradas ? (
              <Card>
                <CardContent className="flex flex-col gap-3 p-4">
                  <p className="text-sm font-medium">Parcelas</p>
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="servico-primeira-data">
                      Qual a data de vencimento da 1ª parcela?
                    </Label>
                    <Input
                      id="servico-primeira-data"
                      type="date"
                      value={wizardPrimeiraData}
                      onChange={(e) => setWizardPrimeiraData(e.target.value)}
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="servico-quantidade">
                      Em quantas parcelas?{" "}
                      {maxParcelas === 1 ? "(à vista permite só 1)" : `(até ${maxParcelas})`}
                    </Label>
                    <Input
                      id="servico-quantidade"
                      type="number"
                      min="1"
                      max={maxParcelas}
                      inputMode="numeric"
                      value={wizardQuantidade}
                      onChange={(e) => setWizardQuantidade(e.target.value)}
                    />
                  </div>
                  <Button
                    type="button"
                    onClick={handleGerarParcelas}
                    disabled={
                      !wizardPrimeiraData ||
                      Number(wizardQuantidade) < 1 ||
                      Number(wizardQuantidade) > maxParcelas
                    }
                    className="self-start"
                  >
                    Gerar parcelas
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <Label>Parcelas (vencimento de cada cobrança)</Label>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setParcelasGeradas(false)}
                    >
                      Gerar novamente
                    </Button>
                    {vencimentos.length < maxParcelas && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setVencimentos((prev) => [...prev, ""])}
                      >
                        <Plus className="size-3.5" />
                        Adicionar parcela
                      </Button>
                    )}
                  </div>
                </div>
                {vencimentos.map((data, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <Input
                      type="date"
                      value={data}
                      onChange={(e) =>
                        setVencimentos((prev) =>
                          prev.map((v, i) => (i === index ? e.target.value : v)),
                        )
                      }
                      required
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="shrink-0"
                      onClick={() =>
                        setVencimentos((prev) => prev.filter((_, i) => i !== index))
                      }
                      disabled={vencimentos.length === 1}
                    >
                      <Trash2 className="size-4 text-destructive" />
                      <span className="sr-only">Remover parcela</span>
                    </Button>
                  </div>
                ))}
              </div>
            )}

            {preview.length > 0 && (
              <Card>
                <CardContent className="flex flex-col gap-2 p-4">
                  <p className="text-sm font-medium">Cobranças que serão geradas</p>
                  <ul className="flex flex-col gap-1 text-sm text-muted-foreground">
                    {preview.map((parcela, i) => (
                      <li key={i} className="flex items-center justify-between gap-2">
                        <span>
                          Parcela {i + 1}/{preview.length}
                        </span>
                        <span>{formatarData(parcela.data)}</span>
                        <span className="font-medium text-foreground">
                          {formatarMoeda(parcela.valor)}
                        </span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}

            {erro && <p className="text-sm text-destructive">{erro}</p>}
          </div>
        )}

        <DialogFooter className="sm:justify-between">
          <Button
            variant="outline"
            onClick={() => {
              setErro(undefined);
              if (step === 1) onOpenChange(false);
              else setStep((s) => (s - 1) as 1 | 2 | 3 | 4);
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
            <Button onClick={() => setStep(4)} disabled={!horaSelecionada}>
              Continuar
            </Button>
          )}
          {step === 4 && (
            <Button
              onClick={confirmar}
              disabled={vencimentos.filter(Boolean).length === 0 || !valorNumero || isPending}
            >
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
