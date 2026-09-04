"use client";

import {
  useActionState,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
} from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { NativeSelect } from "@/components/ui/native-select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { FormActions } from "@/components/ui/form-actions";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  calcularDesconto,
  gerarDatasVencimento,
  gerarValoresParcelas,
  maxParcelasDaForma,
  valorPlano,
  type DescontoTipo,
  type FormaPagamentoPlano,
  type PeriodicidadePlano,
} from "@/lib/planos";
import {
  formaPagamentoPlanoLabels,
  formaPagamentoPlanoValues,
  periodicidadePlanoLabels,
  periodicidadePlanoValues,
} from "@/lib/validations/plano";
import { formatarData, formatarMoeda } from "@/lib/format";
import type { PlanoAtribuicaoActionState } from "@/actions/plano-atribuicoes";

const initialState: PlanoAtribuicaoActionState = {};

type PlanoAtivo = {
  id: string;
  nome: string;
  atendimentos: number;
  valorAVistaMensal: number;
  valorAVistaTrimestral: number;
  valorAVistaNfMensal: number;
  valorAVistaNfTrimestral: number;
  valorAte3xCartaoMensal: number;
  valorAte3xCartaoTrimestral: number;
  valorAte3xNfMensal: number;
  valorAte3xNfTrimestral: number;
};

export function PlanoAtribuicaoForm({
  action,
  planosAtivos,
  defaultValues,
  pacienteId,
  mode,
}: {
  action: (
    prevState: PlanoAtribuicaoActionState,
    formData: FormData,
  ) => Promise<PlanoAtribuicaoActionState>;
  planosAtivos: PlanoAtivo[];
  defaultValues?: {
    planoId: string;
    formaPagamento: FormaPagamentoPlano;
    periodicidade: PeriodicidadePlano;
    vencimentos: string[];
    descontoTipo?: DescontoTipo;
    descontoValor?: number;
    valorAlvoParcela?: number;
  };
  pacienteId: string;
  mode: "create" | "edit";
}) {
  const router = useRouter();
  const [state, formAction] = useActionState(action, initialState);
  const formRef = useRef<HTMLFormElement>(null);
  const confirmadoRef = useRef(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [planoId, setPlanoId] = useState(defaultValues?.planoId ?? planosAtivos[0]?.id ?? "");
  const [formaPagamento, setFormaPagamento] = useState<FormaPagamentoPlano>(
    defaultValues?.formaPagamento ?? "A_VISTA",
  );
  const [periodicidade, setPeriodicidade] = useState<PeriodicidadePlano>(
    defaultValues?.periodicidade ?? "MENSAL",
  );
  const [vencimentos, setVencimentos] = useState<string[]>(
    defaultValues?.vencimentos && defaultValues.vencimentos.length > 0
      ? defaultValues.vencimentos
      : [""],
  );
  const [parcelasGeradas, setParcelasGeradas] = useState(
    Boolean(defaultValues?.vencimentos && defaultValues.vencimentos.length > 0),
  );
  const [wizardPrimeiraData, setWizardPrimeiraData] = useState(
    defaultValues?.vencimentos?.[0] ?? "",
  );
  const [wizardQuantidade, setWizardQuantidade] = useState(
    defaultValues?.vencimentos && defaultValues.vencimentos.length > 0
      ? String(defaultValues.vencimentos.length)
      : "1",
  );
  const [descontoTipo, setDescontoTipo] = useState<DescontoTipo>(
    defaultValues?.descontoTipo ?? "ALVO_PARCELA",
  );
  const [descontoValor, setDescontoValor] = useState(
    defaultValues?.descontoValor ? String(defaultValues.descontoValor) : "",
  );
  const [valorAlvoParcela, setValorAlvoParcela] = useState(
    defaultValues?.valorAlvoParcela ? String(defaultValues.valorAlvoParcela) : "",
  );
  const [valorAlvoTocado, setValorAlvoTocado] = useState(
    Boolean(defaultValues?.valorAlvoParcela),
  );

  useEffect(() => {
    if (state.success) {
      toast.success(
        mode === "create"
          ? "Plano atribuído com sucesso."
          : "Atribuição atualizada com sucesso.",
      );
      router.push(`/pacientes/${pacienteId}?tab=planos`);
    }
  }, [state.success, mode, pacienteId, router]);

  const planoSelecionado = planosAtivos.find((p) => p.id === planoId);
  const maxParcelas = maxParcelasDaForma(formaPagamento);

  useEffect(() => {
    setVencimentos((prev) =>
      prev.length > maxParcelas ? prev.slice(0, maxParcelas) : prev,
    );
    setWizardQuantidade((prev) => (Number(prev) > maxParcelas ? String(maxParcelas) : prev));
  }, [maxParcelas]);

  const valorOriginal = useMemo(() => {
    if (!planoSelecionado) return 0;
    return valorPlano(planoSelecionado, formaPagamento, periodicidade);
  }, [planoSelecionado, formaPagamento, periodicidade]);

  const numeroParcelas = vencimentos.filter(Boolean).length;

  const sugestaoValorAlvoParcela =
    numeroParcelas > 0 && valorOriginal > 0
      ? String(Math.round((valorOriginal / numeroParcelas) * 100) / 100)
      : "";
  const valorAlvoEfetivo = valorAlvoTocado ? valorAlvoParcela : sugestaoValorAlvoParcela;

  const { valor: valorFinal, desconto } = useMemo(
    () =>
      calcularDesconto(
        valorOriginal,
        descontoTipo,
        Number(descontoValor.replace(",", ".")) || 0,
        Number(valorAlvoEfetivo.replace(",", ".")) || 0,
        numeroParcelas,
      ),
    [valorOriginal, descontoTipo, descontoValor, valorAlvoEfetivo, numeroParcelas],
  );

  const descontoPercentual = valorOriginal > 0 ? (desconto / valorOriginal) * 100 : 0;

  const alvoParcelaExcedeValor =
    descontoTipo === "ALVO_PARCELA" &&
    valorAlvoTocado &&
    valorOriginal > 0 &&
    numeroParcelas > 0 &&
    (Number(valorAlvoEfetivo.replace(",", ".")) || 0) * numeroParcelas >= valorOriginal;

  const preview = useMemo(() => {
    const datasValidas = vencimentos.filter(Boolean);
    if (datasValidas.length === 0 || !valorFinal) return [];
    const datasOrdenadas = [...datasValidas].sort();
    const valores = gerarValoresParcelas(valorFinal, datasOrdenadas.length);
    return datasOrdenadas.map((data, i) => ({
      data: new Date(`${data}T12:00:00`),
      valor: valores[i],
    }));
  }, [vencimentos, valorFinal]);

  if (planosAtivos.length === 0 && !defaultValues) {
    return (
      <p className="text-sm text-muted-foreground">
        Nenhum plano cadastrado. Cadastre um plano em{" "}
        <Link href="/planos/novo" className="underline">
          Planos
        </Link>{" "}
        antes de atribuir a um paciente.
      </p>
    );
  }

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    if (mode === "edit" && !confirmadoRef.current) {
      e.preventDefault();
      setShowConfirm(true);
    }
  }

  function confirmarSalvar() {
    confirmadoRef.current = true;
    setShowConfirm(false);
    formRef.current?.requestSubmit();
  }

  function handleGerarParcelas() {
    const quantidade = Math.min(Number(wizardQuantidade), maxParcelas);
    if (!wizardPrimeiraData || !quantidade || quantidade < 1) return;
    setVencimentos(gerarDatasVencimento(wizardPrimeiraData, quantidade));
    setParcelasGeradas(true);
  }

  return (
    <form
      ref={formRef}
      action={formAction}
      onSubmit={handleSubmit}
      className="flex max-w-2xl flex-col gap-4 pb-24"
    >
      <input type="hidden" name="formaPagamento" value={formaPagamento} />
      <input type="hidden" name="periodicidade" value={periodicidade} />
      <input type="hidden" name="descontoTipo" value={descontoTipo} />
      <input type="hidden" name="descontoValor" value={descontoValor} />
      <input type="hidden" name="valorAlvoParcela" value={valorAlvoEfetivo} />
      {vencimentos.filter(Boolean).map((data, i) => (
        <input key={i} type="hidden" name="vencimentos" value={data} />
      ))}

      <div className="flex flex-col gap-2">
        <Label htmlFor="planoId">Plano</Label>
        <NativeSelect
          id="planoId"
          name="planoId"
          value={planoId}
          onChange={(e) => setPlanoId(e.target.value)}
          required
        >
          {planosAtivos.map((p) => (
            <option key={p.id} value={p.id}>
              {p.nome} · {p.atendimentos}x atendimentos
            </option>
          ))}
        </NativeSelect>
      </div>

      <div className="flex flex-col gap-2">
        <Label>Periodicidade</Label>
        <RadioGroup
          value={periodicidade}
          onValueChange={(v) => setPeriodicidade(v as PeriodicidadePlano)}
          className="flex flex-row flex-wrap gap-4"
        >
          {periodicidadePlanoValues.map((p) => (
            <label
              key={p}
              className="flex min-h-8 cursor-pointer items-center gap-2 text-sm select-none"
            >
              <RadioGroupItem value={p} />
              {periodicidadePlanoLabels[p]}
            </label>
          ))}
        </RadioGroup>
      </div>

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
              className="flex min-h-8 cursor-pointer items-center justify-between gap-2 rounded-lg border border-input p-2 text-sm select-none"
            >
              <span className="flex items-center gap-2">
                <RadioGroupItem value={forma} />
                {formaPagamentoPlanoLabels[forma]}
              </span>
              {planoSelecionado && (
                <span className="font-medium text-muted-foreground">
                  {formatarMoeda(valorPlano(planoSelecionado, forma, periodicidade))}
                </span>
              )}
            </label>
          ))}
        </RadioGroup>
      </div>

      {!parcelasGeradas ? (
        <Card>
          <CardContent className="flex flex-col gap-3 p-4">
            <p className="text-sm font-medium">Parcelas</p>
            <div className="flex flex-col gap-2">
              <Label htmlFor="wizardPrimeiraData">
                Qual a data de vencimento da 1ª parcela?
              </Label>
              <Input
                id="wizardPrimeiraData"
                type="date"
                value={wizardPrimeiraData}
                onChange={(e) => setWizardPrimeiraData(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="wizardQuantidade">
                Em quantas parcelas?{" "}
                {maxParcelas === 1
                  ? "(à vista permite só 1)"
                  : `(até ${maxParcelas})`}
              </Label>
              <Input
                id="wizardQuantidade"
                type="number"
                min="1"
                max={maxParcelas}
                inputMode="numeric"
                value={wizardQuantidade}
                onChange={(e) => setWizardQuantidade(e.target.value)}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              A 1ª parcela vence na data informada e as demais no mesmo dia
              dos meses seguintes. Depois é possível ajustar cada data
              individualmente.
            </p>
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
            <Label>Parcelas (data de vencimento de cada cobrança)</Label>
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

      <div className="flex flex-col gap-2">
        <Label htmlFor="descontoTipo">Desconto adicional</Label>
        <NativeSelect
          id="descontoTipo"
          value={descontoTipo}
          onChange={(e) => setDescontoTipo(e.target.value as DescontoTipo)}
        >
          <option value="NENHUM">Sem desconto</option>
          <option value="VALOR">Valor fixo (R$)</option>
          <option value="PERCENTUAL">Percentual (%)</option>
          <option value="ALVO_PARCELA">Definir valor alvo por parcela</option>
        </NativeSelect>

        {descontoTipo === "VALOR" && (
          <Input
            type="number"
            min="0"
            step="0.01"
            inputMode="decimal"
            placeholder="Ex.: 50,00"
            value={descontoValor}
            onChange={(e) => setDescontoValor(e.target.value)}
            required
          />
        )}

        {descontoTipo === "PERCENTUAL" && (
          <Input
            type="number"
            min="0"
            max="100"
            step="0.01"
            inputMode="decimal"
            placeholder="Ex.: 10"
            value={descontoValor}
            onChange={(e) => setDescontoValor(e.target.value)}
            required
          />
        )}

        {descontoTipo === "ALVO_PARCELA" && (
          <>
            <Input
              type="number"
              min="0"
              step="0.01"
              inputMode="decimal"
              placeholder="Valor desejado por parcela, ex.: 150,00"
              value={valorAlvoEfetivo}
              onChange={(e) => {
                setValorAlvoTocado(true);
                setValorAlvoParcela(e.target.value);
              }}
              required
            />
            <p className="text-xs text-muted-foreground">
              Já vem preenchido com o valor sem desconto ({formatarMoeda(valorOriginal / (numeroParcelas || 1))}
              /parcela). Altere para aplicar um desconto.
            </p>
            {alvoParcelaExcedeValor && (
              <p className="text-xs text-destructive">
                O valor alvo informado ({formatarMoeda(Number(valorAlvoEfetivo.replace(",", ".")) || 0)}
                {" "}x {numeroParcelas} parcela{numeroParcelas === 1 ? "" : "s"}) é maior ou
                igual ao valor original ({formatarMoeda(valorOriginal)}). Nenhum desconto será
                aplicado.
              </p>
            )}
          </>
        )}
      </div>

      {valorOriginal > 0 && (
        <Card>
          <CardContent className="flex flex-col gap-1 p-4 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Valor original</span>
              <span>{formatarMoeda(valorOriginal)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Desconto aplicado</span>
              <span className={desconto > 0 ? "text-destructive" : undefined}>
                {desconto > 0
                  ? `- ${formatarMoeda(desconto)} (${descontoPercentual.toFixed(1)}%)`
                  : `${formatarMoeda(0)} (0%)`}
              </span>
            </div>
            <div className="flex items-center justify-between border-t pt-1 font-medium">
              <span>Valor final</span>
              <span>{formatarMoeda(valorFinal)}</span>
            </div>
          </CardContent>
        </Card>
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

      {state.error && <p className="text-sm text-destructive">{state.error}</p>}

      <FormActions
        submitLabel={mode === "create" ? "Atribuir plano" : "Salvar alterações"}
        onCancel={() => router.push(`/pacientes/${pacienteId}?tab=planos`)}
      />

      {mode === "edit" && (
        <Dialog open={showConfirm} onOpenChange={setShowConfirm}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Substituir cobranças pendentes?</DialogTitle>
              <DialogDescription>
                Salvar essa edição vai remover todas as cobranças pendentes
                desta atribuição e gerar novas cobranças automaticamente,
                com os dados atualizados. Cobranças já pagas não são
                afetadas. Deseja continuar?
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowConfirm(false)}>
                Cancelar
              </Button>
              <Button onClick={confirmarSalvar}>Confirmar e salvar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </form>
  );
}
