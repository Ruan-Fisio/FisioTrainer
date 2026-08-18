"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupText,
} from "@/components/ui/input-group";
import { FormActions } from "@/components/ui/form-actions";
import { tipoPlanoLabels, tipoPlanoValues } from "@/lib/validations/plano";
import type { PlanoActionState } from "@/actions/planos";

const initialState: PlanoActionState = {};

type OpcaoDraft = { atendimentos: string; valor: string };

function novaOpcao(): OpcaoDraft {
  return { atendimentos: "", valor: "" };
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
    opcoes: OpcaoDraft[];
    taxaCartao: string;
  };
  mode: "create" | "edit";
}) {
  const router = useRouter();
  const [state, formAction] = useActionState(action, initialState);
  const [tipos, setTipos] = useState<string[]>(
    defaultValues?.tipos ?? ["FISIOTERAPIA"],
  );
  const [opcoes, setOpcoes] = useState<OpcaoDraft[]>(
    defaultValues?.opcoes && defaultValues.opcoes.length > 0
      ? defaultValues.opcoes
      : [novaOpcao()],
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

  function updateOpcao(index: number, patch: Partial<OpcaoDraft>) {
    setOpcoes((prev) =>
      prev.map((o, i) => (i === index ? { ...o, ...patch } : o)),
    );
  }

  return (
    <form action={formAction} className="flex max-w-2xl flex-col gap-4 pb-24">
      {tipos.map((tipo) => (
        <input key={tipo} type="hidden" name="tipos" value={tipo} />
      ))}
      <input type="hidden" name="opcoes" value={JSON.stringify(opcoes)} />

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

      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <Label>Opções (pacotes de atendimentos)</Label>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setOpcoes((prev) => [...prev, novaOpcao()])}
          >
            <Plus className="size-3.5" />
            Adicionar opção
          </Button>
        </div>
        {opcoes.map((opcao, index) => (
          <div
            key={index}
            className="flex flex-col gap-2 rounded-lg border border-input bg-background p-2 sm:flex-row sm:items-end"
          >
            <div className="flex flex-1 flex-col gap-1.5">
              <Label className="text-xs text-muted-foreground">
                Número de atendimentos
              </Label>
              <Input
                type="number"
                min={1}
                step={1}
                value={opcao.atendimentos}
                onChange={(e) =>
                  updateOpcao(index, { atendimentos: e.target.value })
                }
                placeholder="Ex: 4"
                required
              />
            </div>
            <div className="flex flex-1 flex-col gap-1.5">
              <Label className="text-xs text-muted-foreground">Valor</Label>
              <InputGroup>
                <InputGroupAddon>
                  <InputGroupText>R$</InputGroupText>
                </InputGroupAddon>
                <InputGroupInput
                  inputMode="decimal"
                  value={opcao.valor}
                  onChange={(e) => updateOpcao(index, { valor: e.target.value })}
                  placeholder="0,00"
                  required
                />
              </InputGroup>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="shrink-0"
              onClick={() =>
                setOpcoes((prev) => prev.filter((_, i) => i !== index))
              }
              disabled={opcoes.length === 1}
            >
              <Trash2 className="size-4 text-destructive" />
              <span className="sr-only">Remover opção</span>
            </Button>
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-2 sm:max-w-[calc(50%-0.5rem)]">
        <Label htmlFor="taxaCartao">Taxa do cartão (%)</Label>
        <Input
          id="taxaCartao"
          name="taxaCartao"
          inputMode="decimal"
          placeholder="0,00"
          defaultValue={defaultValues?.taxaCartao ?? "0"}
        />
      </div>

      {state.error && <p className="text-sm text-destructive">{state.error}</p>}

      <FormActions
        submitLabel={mode === "create" ? "Criar plano" : "Salvar alterações"}
        onCancel={() => router.push("/planos")}
      />
    </form>
  );
}
