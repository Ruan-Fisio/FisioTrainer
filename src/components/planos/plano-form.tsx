"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupText,
} from "@/components/ui/input-group";
import { FormActions } from "@/components/ui/form-actions";
import { cn } from "@/lib/utils";
import {
  formaPagamentoPlanoLabels,
  formaPagamentoPlanoValues,
  periodicidadePlanoLabels,
  periodicidadePlanoValues,
  tipoPlanoLabels,
  tipoPlanoValues,
} from "@/lib/validations/plano";
import type { PlanoActionState } from "@/actions/planos";

const initialState: PlanoActionState = {};

type Forma = (typeof formaPagamentoPlanoValues)[number];
type Periodicidade = (typeof periodicidadePlanoValues)[number];
type Valores = Record<Forma, Record<Periodicidade, string>>;

const CAMPO_NOME: Record<Forma, Record<Periodicidade, string>> = {
  A_VISTA: { MENSAL: "valorAVistaMensal", TRIMESTRAL: "valorAVistaTrimestral" },
  A_VISTA_NF: { MENSAL: "valorAVistaNfMensal", TRIMESTRAL: "valorAVistaNfTrimestral" },
  ATE_3X_CARTAO: {
    MENSAL: "valorAte3xCartaoMensal",
    TRIMESTRAL: "valorAte3xCartaoTrimestral",
  },
  ATE_3X_NF: { MENSAL: "valorAte3xNfMensal", TRIMESTRAL: "valorAte3xNfTrimestral" },
};

function valoresVazios(): Valores {
  return Object.fromEntries(
    formaPagamentoPlanoValues.map((forma) => [
      forma,
      { MENSAL: "", TRIMESTRAL: "" },
    ]),
  ) as Valores;
}

export function PlanoForm({
  action,
  defaultValues,
  mode,
}: {
  action: (
    prevState: PlanoActionState,
    formData: FormData,
  ) => Promise<PlanoActionState>;
  defaultValues?: {
    nome: string;
    descricao: string;
    tipos: string[];
    atendimentos: string;
    valores: Valores;
  };
  mode: "create" | "edit";
}) {
  const router = useRouter();
  const [state, formAction] = useActionState(action, initialState);
  const [tipos, setTipos] = useState<string[]>(
    defaultValues?.tipos ?? ["FISIOTERAPIA"],
  );
  const [valores, setValores] = useState<Valores>(
    defaultValues?.valores ?? valoresVazios(),
  );

  useEffect(() => {
    if (state.success) {
      toast.success(
        mode === "create" ? "Plano criado com sucesso." : "Plano atualizado com sucesso.",
      );
      router.push("/planos");
    }
  }, [state.success, mode, router]);

  function toggleTipo(tipo: string) {
    setTipos((prev) =>
      prev.includes(tipo) ? prev.filter((t) => t !== tipo) : [...prev, tipo],
    );
  }

  function updateValor(forma: Forma, periodicidade: Periodicidade, value: string) {
    setValores((prev) => ({
      ...prev,
      [forma]: { ...prev[forma], [periodicidade]: value },
    }));
  }

  return (
    <form action={formAction} className="flex max-w-2xl flex-col gap-4 pb-24">
      {tipos.map((tipo) => (
        <input key={tipo} type="hidden" name="tipos" value={tipo} />
      ))}

      <div className="flex flex-col gap-2">
        <Label htmlFor="nome">Nome</Label>
        <Input
          id="nome"
          name="nome"
          defaultValue={defaultValues?.nome}
          placeholder="Mensal Fisioterapia"
          required
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label>Tipo de plano</Label>
        <div className="flex flex-wrap gap-4">
          {tipoPlanoValues.map((v) => (
            <label
              key={v}
              onClick={(e) => {
                e.preventDefault();
                toggleTipo(v);
              }}
              className="flex min-h-8 cursor-pointer items-center gap-2 text-sm select-none"
            >
              <Checkbox
                checked={tipos.includes(v)}
                tabIndex={-1}
                className="pointer-events-none"
              />
              {tipoPlanoLabels[v]}
            </label>
          ))}
        </div>
        {tipos.length === 0 && (
          <p className="text-sm text-destructive">Selecione ao menos um tipo</p>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="descricao">Descrição</Label>
        <Textarea
          id="descricao"
          name="descricao"
          rows={2}
          defaultValue={defaultValues?.descricao}
        />
      </div>

      <div className="flex flex-col gap-2 sm:max-w-[calc(50%-0.5rem)]">
        <Label htmlFor="atendimentos">Número de atendimentos</Label>
        <Input
          id="atendimentos"
          name="atendimentos"
          type="number"
          min={1}
          step={1}
          defaultValue={defaultValues?.atendimentos}
          placeholder="Ex: 4"
          required
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label>Valores por forma de pagamento</Label>
        <div className="overflow-hidden rounded-lg border border-input">
          <div className="hidden grid-cols-[1.4fr_1fr_1fr] gap-2 border-b bg-muted/40 p-2 text-xs font-medium text-muted-foreground sm:grid">
            <span>Forma de pagamento</span>
            <span>Mensal</span>
            <span>Trimestral</span>
          </div>
          {formaPagamentoPlanoValues.map((forma, i) => (
            <div
              key={forma}
              className={cn(
                "grid grid-cols-1 gap-2 p-2 sm:grid-cols-[1.4fr_1fr_1fr] sm:items-center",
                i > 0 && "border-t border-input",
              )}
            >
              <p className="text-sm font-medium">{formaPagamentoPlanoLabels[forma]}</p>
              {periodicidadePlanoValues.map((periodicidade) => (
                <div key={periodicidade} className="flex flex-col gap-1">
                  <Label
                    htmlFor={`valor-${forma}-${periodicidade}`}
                    className="text-xs text-muted-foreground sm:sr-only"
                  >
                    {periodicidadePlanoLabels[periodicidade]}
                  </Label>
                  <InputGroup>
                    <InputGroupAddon>
                      <InputGroupText>R$</InputGroupText>
                    </InputGroupAddon>
                    <InputGroupInput
                      id={`valor-${forma}-${periodicidade}`}
                      name={CAMPO_NOME[forma][periodicidade]}
                      inputMode="decimal"
                      value={valores[forma][periodicidade]}
                      onChange={(e) =>
                        updateValor(forma, periodicidade, e.target.value)
                      }
                      placeholder="0,00"
                      required
                    />
                  </InputGroup>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>

      {state.error && <p className="text-sm text-destructive">{state.error}</p>}

      <FormActions
        submitLabel={mode === "create" ? "Criar plano" : "Salvar alterações"}
        onCancel={() => router.push("/planos")}
      />
    </form>
  );
}
