"use client";

import { Plus, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { NativeSelect } from "@/components/ui/native-select";
import { Card, CardContent } from "@/components/ui/card";
import { DIA_SEMANA_INFO } from "@/lib/funcionamento";
import { temHorarioFixo } from "@/lib/salas";
import { MODALIDADE_AGENDAMENTO_LABEL } from "@/components/agendamentos/agendamento-labels";
import type { getGradeRecorrenteOpcoes } from "@/actions/grade-recorrente";
import type { GradeRecorrenteLinha } from "@/lib/validations/grade-recorrente";
import type { ModalidadeAgendamento } from "@/generated/prisma/enums";

export type GradeOpcoes = Awaited<ReturnType<typeof getGradeRecorrenteOpcoes>>;
export type ModalidadePlano = "EDUCACAO_FISICA" | "FISIOTERAPIA";

export function profissionalAtende(
  p: GradeOpcoes["profissionais"][number],
  modalidade: ModalidadeAgendamento,
) {
  if (modalidade === "FISIOTERAPIA") return p.atendeFisioterapia;
  if (modalidade === "EDUCACAO_FISICA") return p.atendeEducacaoFisica;
  return true;
}

/**
 * Editor da grade de atendimento recorrente (linhas dia da semana + horário + profissional).
 * Usado no formulário de atribuição de plano e no diálogo "Editar grade" da aba Agendamentos.
 */
export function GradeSection({
  linhas,
  onChange,
  modalidades,
  atendimentos,
  opcoes,
  bare = false,
}: {
  linhas: GradeRecorrenteLinha[];
  onChange: (linhas: GradeRecorrenteLinha[]) => void;
  modalidades: ModalidadePlano[];
  atendimentos: number | null;
  opcoes: GradeOpcoes;
  /** Renderiza sem o `Card` externo (para uso dentro de um diálogo). */
  bare?: boolean;
}) {
  const multiModalidade = modalidades.length > 1;
  const noLimite = atendimentos != null && linhas.length >= atendimentos;

  const horariosDe = (modalidade: string) =>
    opcoes.horariosPorModalidade[modalidade] ?? [];

  function novaLinha(): GradeRecorrenteLinha {
    const modalidade = modalidades[0];
    const horarios = horariosDe(modalidade);
    return {
      modalidade,
      diaSemana: "SEGUNDA",
      horario:
        temHorarioFixo(modalidade) && horarios[0] ? horarios[0].horario : "08:00",
      profissionalId: undefined,
    };
  }

  function atualizar(i: number, patch: Partial<GradeRecorrenteLinha>) {
    onChange(
      linhas.map((l, idx) => {
        if (idx !== i) return l;
        const proxima = { ...l, ...patch };
        if (patch.modalidade && patch.modalidade !== l.modalidade) {
          const horarios = horariosDe(patch.modalidade);
          proxima.horario =
            temHorarioFixo(patch.modalidade) && horarios[0]
              ? horarios[0].horario
              : "08:00";
          proxima.profissionalId = undefined;
        }
        return proxima;
      }),
    );
  }

  const conteudo = (
    <>
      <div className="flex flex-col gap-1">
        <p className="text-sm font-medium">Grade de atendimento recorrente</p>
        <p className="text-xs text-muted-foreground">
          Dias, horários e profissionais que se repetem toda semana. Os
          agendamentos são criados automaticamente até esgotar o total do plano
          (mensal = o limite do mês; trimestral = esse limite × 3), enchendo cada
          mês até o limite mensal e transbordando o que não coube para o mês
          seguinte. Respeita sala e agenda do profissional.
          Cada dia pode ser remarcado individualmente depois. Deixe vazio para
          agendar manualmente.
          {atendimentos != null
            ? ` A grade tem no máximo ${atendimentos} dia(s) — a quantidade de atendimentos do plano no mês.`
            : ""}
        </p>
      </div>

      {linhas.map((linha, i) => {
        const horarios = horariosDe(linha.modalidade);
        const usaSelectHorario =
          temHorarioFixo(linha.modalidade) && horarios.length > 0;
        return (
          <div
            key={i}
            className="grid grid-cols-1 gap-2 rounded-lg border p-3 sm:grid-cols-2 lg:grid-cols-4"
          >
            <p className="text-xs font-medium text-muted-foreground sm:col-span-2 lg:col-span-4">
              {i + 1}º atendimento
            </p>
            {multiModalidade && (
              <div className="flex flex-col gap-1 sm:col-span-2 lg:col-span-4">
                <Label className="text-xs" htmlFor={`grade-mod-${i}`}>
                  Modalidade
                </Label>
                <NativeSelect
                  id={`grade-mod-${i}`}
                  value={linha.modalidade}
                  onChange={(e) =>
                    atualizar(i, {
                      modalidade: e.target
                        .value as GradeRecorrenteLinha["modalidade"],
                    })
                  }
                >
                  {modalidades.map((m) => (
                    <option key={m} value={m}>
                      {MODALIDADE_AGENDAMENTO_LABEL[m]}
                    </option>
                  ))}
                </NativeSelect>
              </div>
            )}

            <div className="flex flex-col gap-1">
              <Label className="text-xs" htmlFor={`grade-dia-${i}`}>
                Dia da semana
              </Label>
              <NativeSelect
                id={`grade-dia-${i}`}
                value={linha.diaSemana}
                onChange={(e) =>
                  atualizar(i, {
                    diaSemana: e.target.value as GradeRecorrenteLinha["diaSemana"],
                  })
                }
              >
                {DIA_SEMANA_INFO.map((d) => (
                  <option key={d.valor} value={d.valor}>
                    {d.label}
                  </option>
                ))}
              </NativeSelect>
            </div>

            <div className="flex flex-col gap-1">
              <Label className="text-xs" htmlFor={`grade-hora-${i}`}>
                Horário
              </Label>
              {usaSelectHorario ? (
                <NativeSelect
                  id={`grade-hora-${i}`}
                  value={linha.horario}
                  onChange={(e) => atualizar(i, { horario: e.target.value })}
                >
                  {horarios.map((h) => (
                    <option key={h.horario} value={h.horario}>
                      {h.horario}
                    </option>
                  ))}
                </NativeSelect>
              ) : (
                <Input
                  id={`grade-hora-${i}`}
                  type="time"
                  value={linha.horario}
                  onChange={(e) => atualizar(i, { horario: e.target.value })}
                />
              )}
            </div>

            <div className="flex flex-col gap-1">
              <Label className="text-xs" htmlFor={`grade-prof-${i}`}>
                Profissional
              </Label>
              <NativeSelect
                id={`grade-prof-${i}`}
                value={linha.profissionalId ?? ""}
                onChange={(e) =>
                  atualizar(i, { profissionalId: e.target.value || undefined })
                }
              >
                <option value="">Sem profissional</option>
                {opcoes.profissionais
                  .filter((p) =>
                    profissionalAtende(p, linha.modalidade as ModalidadeAgendamento),
                  )
                  .map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name ?? "Sem nome"}
                    </option>
                  ))}
              </NativeSelect>
            </div>

            <div className="flex items-end">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-destructive"
                onClick={() => onChange(linhas.filter((_, idx) => idx !== i))}
              >
                <Trash2 className="size-4" />
                Remover
              </Button>
            </div>
          </div>
        );
      })}

      <Button
        type="button"
        variant="outline"
        size="sm"
        className="self-start"
        disabled={noLimite}
        onClick={() => onChange([...linhas, novaLinha()])}
      >
        <Plus className="size-4" />
        Adicionar dia
      </Button>
      {noLimite && (
        <p className="text-xs text-muted-foreground">
          Limite de {atendimentos} dia(s) da grade atingido (atendimentos do plano
          no mês). Remova um dia para trocar.
        </p>
      )}
    </>
  );

  if (bare) {
    return <div className="flex flex-col gap-3">{conteudo}</div>;
  }

  return (
    <Card>
      <CardContent className="flex flex-col gap-3 p-4">{conteudo}</CardContent>
    </Card>
  );
}
