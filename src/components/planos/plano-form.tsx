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
import { tipoPlanoLabels, tipoPlanoValues } from "@/lib/validations/plano";
import type { PlanoActionState } from "@/actions/planos";
import type { listSalas } from "@/actions/salas";

type Sala = Awaited<ReturnType<typeof listSalas>>[number];
type PlanoSalaLinha = { salaId: string; descricao: string };

const initialState: PlanoActionState = {};

const CAMPOS_VALOR = [
  { name: "valorAVistaMensal", label: "Mensal (à vista)" },
  { name: "valorAVistaTrimestral", label: "Trimestral à vista" },
  { name: "valorAte3xTrimestral", label: "Trimestral em até 3x no cartão" },
] as const;

type CampoValor = (typeof CAMPOS_VALOR)[number]["name"];
type Valores = Record<CampoValor, string>;

function valoresVazios(): Valores {
  return { valorAVistaMensal: "", valorAVistaTrimestral: "", valorAte3xTrimestral: "" };
}

export function PlanoForm({
  action,
  defaultValues,
  mode,
  salas,
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
    creditosRemarcacao: string;
    valores: Valores;
    salas: PlanoSalaLinha[];
  };
  mode: "create" | "edit";
  /** Salas cadastradas em Configurações, pra marcar quais o plano pode usar. */
  salas: Sala[];
}) {
  const router = useRouter();
  const [state, formAction] = useActionState(action, initialState);
  const [tipos, setTipos] = useState<string[]>(
    defaultValues?.tipos ?? ["FISIOTERAPIA"],
  );
  const [valores, setValores] = useState<Valores>(
    defaultValues?.valores ?? valoresVazios(),
  );
  const [salasSelecionadas, setSalasSelecionadas] = useState<PlanoSalaLinha[]>(
    defaultValues?.salas ?? [],
  );

  function toggleSala(salaId: string) {
    setSalasSelecionadas((prev) =>
      prev.some((s) => s.salaId === salaId)
        ? prev.filter((s) => s.salaId !== salaId)
        : [...prev, { salaId, descricao: "" }],
    );
  }

  function atualizarDescricaoSala(salaId: string, descricao: string) {
    setSalasSelecionadas((prev) =>
      prev.map((s) => (s.salaId === salaId ? { ...s, descricao } : s)),
    );
  }

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

  return (
    <form action={formAction} className="flex max-w-2xl flex-col gap-4 pb-24">
      {tipos.map((tipo) => (
        <input key={tipo} type="hidden" name="tipos" value={tipo} />
      ))}
      <input type="hidden" name="salas" value={JSON.stringify(salasSelecionadas)} />

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
        <Label>Salas de atendimento</Label>
        <p className="text-xs text-muted-foreground">
          Em quais salas este plano pode ser executado. Ao agendar, o sistema tenta
          cada sala marcada na ordem cadastrada em Configurações e usa a primeira com
          vaga — pelo menos uma é obrigatória.
        </p>
        {salas.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nenhuma sala cadastrada ainda. Cadastre em Configurações → Salas.
          </p>
        ) : (
          <div className="flex flex-col gap-2 rounded-lg border border-input p-3">
            {salas.map((sala) => {
              const linha = salasSelecionadas.find((s) => s.salaId === sala.id);
              const marcada = linha != null;
              return (
                <div key={sala.id} className="flex flex-col gap-2">
                  <label
                    onClick={(e) => {
                      e.preventDefault();
                      toggleSala(sala.id);
                    }}
                    className="flex min-h-8 cursor-pointer items-center gap-2 text-sm select-none"
                  >
                    <Checkbox
                      checked={marcada}
                      tabIndex={-1}
                      className="pointer-events-none"
                    />
                    {sala.nome}
                  </label>
                  {marcada && (
                    <div className="ml-8 flex flex-col gap-1">
                      <Label htmlFor={`sala-descricao-${sala.id}`} className="sr-only">
                        Descrição do uso da {sala.nome} neste plano
                      </Label>
                      <Input
                        id={`sala-descricao-${sala.id}`}
                        value={linha.descricao}
                        onChange={(e) => atualizarDescricaoSala(sala.id, e.target.value)}
                        placeholder="Descreva o uso desta sala neste plano (opcional)"
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
        {salasSelecionadas.length === 0 && (
          <p className="text-sm text-destructive">Selecione ao menos uma sala</p>
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

      <div className="flex flex-col gap-2 sm:max-w-[calc(50%-0.5rem)]">
        <Label htmlFor="creditosRemarcacao">Créditos de remarcação por mês</Label>
        <Input
          id="creditosRemarcacao"
          name="creditosRemarcacao"
          type="number"
          min={0}
          step={1}
          defaultValue={defaultValues?.creditosRemarcacao ?? "0"}
          placeholder="Ex: 2"
          required
        />
        <p className="text-xs text-muted-foreground">
          Quantas vezes um atendimento deste plano pode ser remarcado por mês (pelo
          paciente ou pela clínica). Reseta a cada mês.
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <Label>Valores</Label>
        <p className="text-xs text-muted-foreground">
          O plano mensal não é parcelado. O trimestral pode ser pago à vista ou
          em até 3x no cartão. Todos os valores já incluem a nota fiscal.
        </p>
        <div className="overflow-hidden rounded-lg border border-input">
          {CAMPOS_VALOR.map((campo, i) => (
            <div
              key={campo.name}
              className={
                "flex flex-col gap-1 p-2 sm:flex-row sm:items-center sm:justify-between sm:gap-4" +
                (i > 0 ? " border-t border-input" : "")
              }
            >
              <Label htmlFor={`valor-${campo.name}`} className="text-sm font-medium">
                {campo.label}
              </Label>
              <InputGroup className="sm:max-w-[12rem]">
                <InputGroupAddon>
                  <InputGroupText>R$</InputGroupText>
                </InputGroupAddon>
                <InputGroupInput
                  id={`valor-${campo.name}`}
                  name={campo.name}
                  inputMode="decimal"
                  value={valores[campo.name]}
                  onChange={(e) =>
                    setValores((prev) => ({ ...prev, [campo.name]: e.target.value }))
                  }
                  placeholder="0,00"
                  required
                />
              </InputGroup>
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
