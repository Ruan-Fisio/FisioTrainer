"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { FormActions } from "@/components/ui/form-actions";
import type { EvolucaoActionState } from "@/actions/evolucoes";

const initialState: EvolucaoActionState = {};

const TEXT_FIELDS: {
  key: "hdp" | "hda" | "evolucao" | "conduta";
  label: string;
}[] = [
  { key: "hdp", label: "HDP (Histórico da Doença Pregressa)" },
  { key: "hda", label: "HDA (Histórico da Doença Atual)" },
];

type VitalKey = "pa" | "fc" | "spo2" | "fr" | "temperatura";

const VITAL_FIELDS: { key: VitalKey; label: string; placeholder: string }[] = [
  { key: "pa", label: "PA", placeholder: "156x112" },
  { key: "fc", label: "FC", placeholder: "70" },
  { key: "spo2", label: "SpO2", placeholder: "96" },
  { key: "fr", label: "FR", placeholder: "21" },
  { key: "temperatura", label: "Temperatura", placeholder: "36,2" },
];

const VITAL_UNITS: Record<VitalKey, { suffix: string; spaced: boolean }> = {
  pa: { suffix: "mmHg", spaced: true },
  fc: { suffix: "bpm", spaced: true },
  spo2: { suffix: "%", spaced: false },
  fr: { suffix: "irpm", spaced: true },
  temperatura: { suffix: "°C", spaced: false },
};

function suffixPatternFor(suffix: string): RegExp {
  return new RegExp(
    `\\s*${suffix.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`,
    "i",
  );
}

function stripVitalSuffix(key: VitalKey, raw: string): string {
  const { suffix } = VITAL_UNITS[key];
  return raw.trim().replace(suffixPatternFor(suffix), "").trim();
}

function formatVital(key: VitalKey, raw: string): string {
  const { suffix, spaced } = VITAL_UNITS[key];
  const value = stripVitalSuffix(key, raw);
  if (!value) return "";
  return spaced ? `${value} ${suffix}` : `${value}${suffix}`;
}

const EVOLUCAO_FIELDS: { key: "evolucao" | "conduta"; label: string }[] = [
  { key: "evolucao", label: "Evolução" },
  { key: "conduta", label: "Conduta" },
];

export function EvolucaoForm({
  action,
  defaultValues,
  pacienteId,
  mode,
}: {
  action: (
    prevState: EvolucaoActionState,
    formData: FormData,
  ) => Promise<EvolucaoActionState>;
  defaultValues?: Record<string, string>;
  pacienteId: string;
  mode: "create" | "edit";
}) {
  const router = useRouter();
  const [state, formAction] = useActionState(action, initialState);
  const [vitals, setVitals] = useState<Record<VitalKey, string>>({
    pa: defaultValues?.pa ?? "",
    fc: defaultValues?.fc ?? "",
    spo2: defaultValues?.spo2 ?? "",
    fr: defaultValues?.fr ?? "",
    temperatura: defaultValues?.temperatura ?? "",
  });

  useEffect(() => {
    if (state.success) {
      toast.success(
        mode === "create"
          ? "Evolução registrada com sucesso."
          : "Evolução atualizada com sucesso.",
      );
      router.push(`/pacientes/${pacienteId}`);
    }
  }, [state.success, mode, pacienteId, router]);

  return (
    <form action={formAction} className="flex max-w-2xl flex-col gap-4 pb-24">
      {TEXT_FIELDS.map(({ key, label }) => (
        <div key={key} className="flex flex-col gap-2">
          <Label htmlFor={key}>{label}</Label>
          <Textarea
            id={key}
            name={key}
            defaultValue={defaultValues?.[key]}
            rows={4}
            required
          />
        </div>
      ))}

      <div className="flex flex-col gap-2">
        <Label>Sinais Vitais</Label>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          {VITAL_FIELDS.map(({ key, label, placeholder }) => (
            <div key={key} className="flex flex-col gap-1">
              <Label htmlFor={key} className="text-xs text-muted-foreground">
                {label}
              </Label>
              <Input
                id={key}
                name={key}
                placeholder={placeholder}
                value={vitals[key]}
                onChange={(e) =>
                  setVitals((prev) => ({ ...prev, [key]: e.target.value }))
                }
                onFocus={(e) =>
                  setVitals((prev) => ({
                    ...prev,
                    [key]: stripVitalSuffix(key, e.target.value),
                  }))
                }
                onBlur={(e) =>
                  setVitals((prev) => ({
                    ...prev,
                    [key]: formatVital(key, e.target.value),
                  }))
                }
                required
              />
            </div>
          ))}
        </div>
      </div>

      {EVOLUCAO_FIELDS.map(({ key, label }) => (
        <div key={key} className="flex flex-col gap-2">
          <Label htmlFor={key}>{label}</Label>
          <Textarea
            id={key}
            name={key}
            defaultValue={defaultValues?.[key]}
            rows={4}
            required
          />
        </div>
      ))}
      {state.error && (
        <p className="text-sm text-destructive">{state.error}</p>
      )}
      <FormActions
        submitLabel={mode === "create" ? "Registrar evolução" : "Salvar alterações"}
        onCancel={() => router.push(`/pacientes/${pacienteId}`)}
      />
    </form>
  );
}
