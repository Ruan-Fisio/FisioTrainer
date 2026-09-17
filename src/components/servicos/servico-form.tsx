"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { FormActions } from "@/components/ui/form-actions";
import type { ServicoActionState } from "@/actions/servicos";
import type { listSalas } from "@/actions/salas";
import type { listAllUsuarios } from "@/actions/usuarios";

type Sala = Awaited<ReturnType<typeof listSalas>>[number];
type Usuario = Awaited<ReturnType<typeof listAllUsuarios>>[number];
type SalaServicoLinha = { salaId: string; capacidade: string; descricao: string };

const initialState: ServicoActionState = {};

export function ServicoForm({
  action,
  defaultValues,
  mode,
  salas,
  usuarios,
}: {
  action: (
    prevState: ServicoActionState,
    formData: FormData,
  ) => Promise<ServicoActionState>;
  defaultValues?: {
    nome: string;
    ativo: boolean;
    valorPadrao: string;
    taxaProfissionalPercentual: string;
    salas: SalaServicoLinha[];
    profissionais: string[];
  };
  mode: "create" | "edit";
  /** Salas cadastradas em Configurações, pra marcar quais o serviço pode usar. */
  salas: Sala[];
  /** Todos os usuários, pra marcar quais atendem este serviço. */
  usuarios: Usuario[];
}) {
  const router = useRouter();
  const [state, formAction] = useActionState(action, initialState);
  const [ativo, setAtivo] = useState(defaultValues?.ativo ?? true);
  const [salasSelecionadas, setSalasSelecionadas] = useState<SalaServicoLinha[]>(
    defaultValues?.salas ?? [],
  );
  const [profissionaisSelecionados, setProfissionaisSelecionados] = useState<string[]>(
    defaultValues?.profissionais ?? [],
  );

  function toggleSala(salaId: string) {
    setSalasSelecionadas((prev) =>
      prev.some((s) => s.salaId === salaId)
        ? prev.filter((s) => s.salaId !== salaId)
        : [...prev, { salaId, capacidade: "1", descricao: "" }],
    );
  }

  function atualizarSala(salaId: string, campo: "capacidade" | "descricao", valor: string) {
    setSalasSelecionadas((prev) =>
      prev.map((s) => (s.salaId === salaId ? { ...s, [campo]: valor } : s)),
    );
  }

  function toggleProfissional(usuarioId: string) {
    setProfissionaisSelecionados((prev) =>
      prev.includes(usuarioId) ? prev.filter((id) => id !== usuarioId) : [...prev, usuarioId],
    );
  }

  useEffect(() => {
    if (state.success) {
      toast.success(
        mode === "create" ? "Serviço criado com sucesso." : "Serviço atualizado com sucesso.",
      );
      router.push("/servicos");
    }
  }, [state.success, mode, router]);

  return (
    <form action={formAction} className="flex max-w-2xl flex-col gap-4 pb-24">
      <input type="hidden" name="salas" value={JSON.stringify(salasSelecionadas)} />
      <input
        type="hidden"
        name="profissionais"
        value={JSON.stringify(profissionaisSelecionados)}
      />

      <div className="flex flex-col gap-2">
        <Label htmlFor="nome">Nome</Label>
        <Input
          id="nome"
          name="nome"
          defaultValue={defaultValues?.nome}
          placeholder="Psicologia"
          required
        />
      </div>

      <div className="flex items-center gap-2">
        <Checkbox
          id="ativo"
          name="ativo"
          checked={ativo}
          onCheckedChange={(checked) => setAtivo(checked === true)}
        />
        <Label htmlFor="ativo" className="font-normal">
          Serviço ativo (aparece para agendar)
        </Label>
      </div>

      <div className="flex flex-col gap-2">
        <Label>Valor e taxa</Label>
        <p className="text-xs text-muted-foreground">
          O valor padrão é pré-preenchido no agendamento avulso deste serviço, mas pode
          ser editado na hora. A taxa é o percentual que a clínica retém sobre cada
          atendimento — só informativo no dashboard financeiro.
        </p>
        <div className="grid grid-cols-1 gap-4 rounded-lg border border-input p-3 sm:grid-cols-2">
          <div className="flex flex-col gap-2">
            <Label htmlFor="valorPadrao">Valor padrão (R$)</Label>
            <Input
              id="valorPadrao"
              name="valorPadrao"
              inputMode="decimal"
              defaultValue={defaultValues?.valorPadrao}
              placeholder="150,00"
              required
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="taxaProfissionalPercentual">Taxa retida do profissional (%)</Label>
            <Input
              id="taxaProfissionalPercentual"
              name="taxaProfissionalPercentual"
              inputMode="decimal"
              defaultValue={defaultValues?.taxaProfissionalPercentual}
              placeholder="20"
              required
            />
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <Label>Salas de atendimento</Label>
        <p className="text-xs text-muted-foreground">
          Em quais salas este serviço pode ser executado, com capacidade própria. Um
          serviço sem nenhuma sala marcada não passa por checagem de sala/capacidade ao
          agendar.
        </p>
        {salas.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nenhuma sala cadastrada ainda. Cadastre em Configurações → Salas.
          </p>
        ) : (
          <div className="flex flex-col gap-3 rounded-lg border border-input p-3">
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
                    <div className="ml-8 grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <div className="flex flex-col gap-1">
                        <Label htmlFor={`sala-capacidade-${sala.id}`} className="text-xs">
                          Capacidade
                        </Label>
                        <Input
                          id={`sala-capacidade-${sala.id}`}
                          type="number"
                          min={1}
                          step={1}
                          value={linha.capacidade}
                          onChange={(e) =>
                            atualizarSala(sala.id, "capacidade", e.target.value)
                          }
                        />
                      </div>
                      <div className="flex flex-col gap-1">
                        <Label htmlFor={`sala-descricao-${sala.id}`} className="text-xs">
                          Descrição (opcional)
                        </Label>
                        <Input
                          id={`sala-descricao-${sala.id}`}
                          value={linha.descricao}
                          onChange={(e) =>
                            atualizarSala(sala.id, "descricao", e.target.value)
                          }
                          placeholder="Descreva o uso desta sala neste serviço"
                        />
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <Label>Profissionais habilitados</Label>
        <p className="text-xs text-muted-foreground">
          Quem pode ser escolhido como profissional ao agendar este serviço. Nenhum
          profissional marcado permite escolher qualquer usuário.
        </p>
        {usuarios.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum usuário cadastrado ainda.</p>
        ) : (
          <div className="flex flex-col gap-2 rounded-lg border border-input p-3">
            {usuarios.map((usuario) => (
              <label
                key={usuario.id}
                onClick={(e) => {
                  e.preventDefault();
                  toggleProfissional(usuario.id);
                }}
                className="flex min-h-8 cursor-pointer items-center gap-2 text-sm select-none"
              >
                <Checkbox
                  checked={profissionaisSelecionados.includes(usuario.id)}
                  tabIndex={-1}
                  className="pointer-events-none"
                />
                {usuario.name}
              </label>
            ))}
          </div>
        )}
      </div>

      {state.error && <p className="text-sm text-destructive">{state.error}</p>}

      <FormActions
        submitLabel={mode === "create" ? "Criar serviço" : "Salvar alterações"}
        onCancel={() => router.push("/servicos")}
      />
    </form>
  );
}
