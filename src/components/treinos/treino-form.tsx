"use client";

import { useActionState, useEffect, useId, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { NativeSelect } from "@/components/ui/native-select";
import { FormActions } from "@/components/ui/form-actions";
import { LinkPreviewCard } from "@/components/exercicios/link-preview-card";
import {
  ExercicioPicker,
  type ExercicioOption,
} from "@/components/treinos/exercicio-picker";
import { DIAS_SEMANA, DIA_SEMANA_LABELS, type DiaSemana } from "@/lib/dia-semana";

type ExercicioDiaState = {
  key: string;
  id?: string;
  exercicioId: string;
  series: string;
  repeticoes: string;
  carga: string;
  descanso: string;
  instrucoes: string;
};

type DiaState = {
  key: string;
  id?: string;
  diaSemana: DiaSemana;
  exercicios: ExercicioDiaState[];
};

type TreinoFormState = {
  error?: string;
  success?: boolean;
};

type DefaultValues = {
  nome: string;
  descricao: string;
  dias: {
    id: string;
    diaSemana: DiaSemana;
    exercicios: {
      id: string;
      exercicioId: string;
      series: number | null;
      repeticoes: string | null;
      carga: number | null;
      descanso: number | null;
      instrucoes: string | null;
    }[];
  }[];
};

function novaChave() {
  return Math.random().toString(36).slice(2);
}

function novoExercicio(): ExercicioDiaState {
  return {
    key: novaChave(),
    exercicioId: "",
    series: "",
    repeticoes: "",
    carga: "",
    descanso: "",
    instrucoes: "",
  };
}

function novoDia(): DiaState {
  return {
    key: novaChave(),
    diaSemana: "SEGUNDA",
    exercicios: [novoExercicio()],
  };
}

function fromDefaultValues(defaultValues?: DefaultValues): DiaState[] {
  if (!defaultValues || defaultValues.dias.length === 0) return [novoDia()];

  return defaultValues.dias.map((dia) => ({
    key: novaChave(),
    id: dia.id,
    diaSemana: dia.diaSemana,
    exercicios:
      dia.exercicios.length > 0
        ? dia.exercicios.map((exercicio) => ({
            key: novaChave(),
            id: exercicio.id,
            exercicioId: exercicio.exercicioId,
            series: exercicio.series != null ? String(exercicio.series) : "",
            repeticoes: exercicio.repeticoes ?? "",
            carga: exercicio.carga != null ? String(exercicio.carga) : "",
            descanso: exercicio.descanso != null ? String(exercicio.descanso) : "",
            instrucoes: exercicio.instrucoes ?? "",
          }))
        : [novoExercicio()],
  }));
}

export function TreinoForm({
  action,
  exercicioOptions,
  defaultValues,
  mode,
  backHref,
  submitLabel,
}: {
  action: (
    prevState: TreinoFormState,
    formData: FormData,
  ) => Promise<TreinoFormState>;
  exercicioOptions: ExercicioOption[];
  defaultValues?: DefaultValues;
  mode: "create" | "edit";
  backHref: string;
  submitLabel?: string;
}) {
  const router = useRouter();
  const [state, formAction] = useActionState(action, {} as TreinoFormState);
  const [dias, setDias] = useState<DiaState[]>(() => fromDefaultValues(defaultValues));
  const nomeId = useId();
  const descricaoId = useId();

  useEffect(() => {
    if (state.success) {
      toast.success(
        mode === "create"
          ? "Treino criado com sucesso."
          : "Treino atualizado com sucesso.",
      );
      router.push(backHref);
    }
  }, [state.success, mode, router, backHref]);

  function addDia() {
    setDias((prev) => [...prev, novoDia()]);
  }

  function removeDia(diaKey: string) {
    setDias((prev) => prev.filter((dia) => dia.key !== diaKey));
  }

  function updateDia(diaKey: string, diaSemana: DiaSemana) {
    setDias((prev) =>
      prev.map((dia) => (dia.key === diaKey ? { ...dia, diaSemana } : dia)),
    );
  }

  function addExercicio(diaKey: string) {
    setDias((prev) =>
      prev.map((dia) =>
        dia.key === diaKey
          ? { ...dia, exercicios: [...dia.exercicios, novoExercicio()] }
          : dia,
      ),
    );
  }

  function removeExercicio(diaKey: string, exercicioKey: string) {
    setDias((prev) =>
      prev.map((dia) =>
        dia.key === diaKey
          ? {
              ...dia,
              exercicios: dia.exercicios.filter((e) => e.key !== exercicioKey),
            }
          : dia,
      ),
    );
  }

  function updateExercicio(
    diaKey: string,
    exercicioKey: string,
    changes: Partial<ExercicioDiaState>,
  ) {
    setDias((prev) =>
      prev.map((dia) =>
        dia.key === diaKey
          ? {
              ...dia,
              exercicios: dia.exercicios.map((exercicio) =>
                exercicio.key === exercicioKey
                  ? { ...exercicio, ...changes }
                  : exercicio,
              ),
            }
          : dia,
      ),
    );
  }

  const diasPayload = dias
    .filter((dia) => dia.exercicios.some((e) => e.exercicioId))
    .map((dia) => ({
      id: dia.id,
      diaSemana: dia.diaSemana,
      exercicios: dia.exercicios
        .filter((exercicio) => exercicio.exercicioId)
        .map((exercicio) => ({
          id: exercicio.id,
          exercicioId: exercicio.exercicioId,
          series: exercicio.series ? Number(exercicio.series) : undefined,
          repeticoes: exercicio.repeticoes || undefined,
          carga: exercicio.carga ? Number(exercicio.carga) : undefined,
          descanso: exercicio.descanso ? Number(exercicio.descanso) : undefined,
          instrucoes: exercicio.instrucoes || undefined,
        })),
    }));

  return (
    <form action={formAction} className="flex max-w-3xl flex-col gap-6 pb-24">
      <input type="hidden" name="dias" value={JSON.stringify(diasPayload)} />

      <div className="flex flex-col gap-2">
        <Label htmlFor={nomeId}>Nome</Label>
        <Input
          id={nomeId}
          name="nome"
          defaultValue={defaultValues?.nome}
          required
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor={descricaoId}>Descrição</Label>
        <Textarea
          id={descricaoId}
          name="descricao"
          defaultValue={defaultValues?.descricao}
          rows={3}
        />
      </div>

      <div className="flex flex-col gap-4">
        <Label>Dias e exercícios</Label>

        {dias.map((dia) => (
          <Card key={dia.key}>
            <CardContent className="flex flex-col gap-4 p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex flex-1 flex-col gap-2 sm:max-w-xs">
                  <Label htmlFor={`dia-semana-${dia.key}`} className="text-xs">
                    Dia da semana
                  </Label>
                  <NativeSelect
                    id={`dia-semana-${dia.key}`}
                    value={dia.diaSemana}
                    onChange={(event) =>
                      updateDia(dia.key, event.target.value as DiaSemana)
                    }
                  >
                    {DIAS_SEMANA.map((diaSemana) => (
                      <option key={diaSemana} value={diaSemana}>
                        {DIA_SEMANA_LABELS[diaSemana]}
                      </option>
                    ))}
                  </NativeSelect>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => removeDia(dia.key)}
                  disabled={dias.length === 1}
                  className="w-fit self-end text-destructive sm:self-auto"
                >
                  <Trash2 className="size-4" />
                  Remover dia
                </Button>
              </div>

              <div className="flex flex-col gap-3">
                {dia.exercicios.map((exercicio) => (
                  <Card key={exercicio.key} className="bg-muted/30">
                    <CardContent className="flex flex-col gap-3 p-3">
                      <div className="flex items-start gap-2">
                        <div className="flex-1">
                          <ExercicioPicker
                            options={exercicioOptions}
                            value={exercicio.exercicioId}
                            onChange={(exercicioId) =>
                              updateExercicio(dia.key, exercicio.key, {
                                exercicioId,
                              })
                            }
                          />
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeExercicio(dia.key, exercicio.key)}
                          disabled={dia.exercicios.length === 1}
                        >
                          <Trash2 className="size-4 text-destructive" />
                          <span className="sr-only">Remover exercício</span>
                        </Button>
                      </div>

                      {(() => {
                        const links = exercicioOptions.find(
                          (option) => option.id === exercicio.exercicioId,
                        )?.links;
                        if (!links || links.length === 0) return null;
                        return (
                          <div className="flex flex-col gap-2">
                            {links.map((link) => (
                              <LinkPreviewCard key={link.id} url={link.url} />
                            ))}
                          </div>
                        );
                      })()}

                      <div className="grid grid-cols-1 gap-2 sm:grid-cols-4">
                        <div className="flex flex-col gap-1">
                          <Label htmlFor={`series-${exercicio.key}`} className="text-xs">
                            Séries
                          </Label>
                          <Input
                            id={`series-${exercicio.key}`}
                            placeholder="Séries"
                            type="number"
                            min="1"
                            inputMode="numeric"
                            value={exercicio.series}
                            onChange={(event) =>
                              updateExercicio(dia.key, exercicio.key, {
                                series: event.target.value,
                              })
                            }
                          />
                        </div>
                        <div className="flex flex-col gap-1">
                          <Label htmlFor={`repeticoes-${exercicio.key}`} className="text-xs">
                            Repetições
                          </Label>
                          <Input
                            id={`repeticoes-${exercicio.key}`}
                            placeholder="Repetições"
                            value={exercicio.repeticoes}
                            onChange={(event) =>
                              updateExercicio(dia.key, exercicio.key, {
                                repeticoes: event.target.value,
                              })
                            }
                          />
                        </div>
                        <div className="flex flex-col gap-1">
                          <Label htmlFor={`carga-${exercicio.key}`} className="text-xs">
                            Carga
                          </Label>
                          <div className="relative">
                            <Input
                              id={`carga-${exercicio.key}`}
                              placeholder="Carga"
                              type="number"
                              min="0"
                              step="0.5"
                              inputMode="decimal"
                              className="pr-8"
                              value={exercicio.carga}
                              onChange={(event) =>
                                updateExercicio(dia.key, exercicio.key, {
                                  carga: event.target.value,
                                })
                              }
                            />
                            <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs text-muted-foreground">
                              kg
                            </span>
                          </div>
                        </div>
                        <div className="flex flex-col gap-1">
                          <Label htmlFor={`descanso-${exercicio.key}`} className="text-xs">
                            Descanso
                          </Label>
                          <div className="relative">
                          <Input
                            id={`descanso-${exercicio.key}`}
                            placeholder="Descanso"
                            type="number"
                            min="0"
                            step="1"
                            inputMode="numeric"
                            className="pr-6"
                            value={exercicio.descanso}
                            onChange={(event) =>
                              updateExercicio(dia.key, exercicio.key, {
                                descanso: event.target.value,
                              })
                            }
                          />
                          <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs text-muted-foreground">
                            s
                          </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col gap-1">
                        <Label
                          htmlFor={`instrucoes-${exercicio.key}`}
                          className="text-xs"
                        >
                          Instruções
                        </Label>
                        <Textarea
                          id={`instrucoes-${exercicio.key}`}
                          placeholder="Instruções"
                          rows={2}
                          value={exercicio.instrucoes}
                          onChange={(event) =>
                            updateExercicio(dia.key, exercicio.key, {
                              instrucoes: event.target.value,
                            })
                          }
                        />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-fit"
                onClick={() => addExercicio(dia.key)}
              >
                <Plus />
                Adicionar exercício
              </Button>
            </CardContent>
          </Card>
        ))}

        <Button type="button" variant="outline" className="w-fit" onClick={addDia}>
          <Plus />
          Adicionar dia
        </Button>
      </div>

      {state.error && <p className="text-sm text-destructive">{state.error}</p>}

      <FormActions
        submitLabel={
          submitLabel ?? (mode === "create" ? "Criar treino" : "Salvar alterações")
        }
        onCancel={() => router.push(backHref)}
      />
    </form>
  );
}
