"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FormActions } from "@/components/ui/form-actions";
import type { PacienteActionState } from "@/actions/pacientes";

const initialState: PacienteActionState = {};

export function PacienteForm({
  action,
  defaultValues,
  mode,
}: {
  action: (
    prevState: PacienteActionState,
    formData: FormData,
  ) => Promise<PacienteActionState>;
  defaultValues?: {
    nome: string;
    idade: number | null;
    dataNascimento: string | null;
    cpf: string | null;
    contato: string | null;
    endereco: string | null;
    historicoClinico: string | null;
    objetivo: string | null;
    doencasPreexistentes: string | null;
    cirurgiasAnteriores: string | null;
    medicamentos: string | null;
    numeroIndicacao: string | null;
    pessoaIndicacao: string | null;
  };
  mode: "create" | "edit";
}) {
  const router = useRouter();
  const [state, formAction] = useActionState(action, initialState);

  useEffect(() => {
    if (state.success) {
      toast.success(
        mode === "create"
          ? "Paciente criado com sucesso."
          : "Paciente atualizado com sucesso.",
      );
      router.push("/pacientes");
    }
  }, [state.success, mode, router]);

  return (
    <form action={formAction} className="flex max-w-2xl flex-col gap-6 pb-24">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Dados pessoais</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="nome">Nome</Label>
            <Input
              id="nome"
              name="nome"
              defaultValue={defaultValues?.nome}
              required
            />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="idade">Idade</Label>
              <Input
                id="idade"
                name="idade"
                type="number"
                min={0}
                defaultValue={defaultValues?.idade ?? undefined}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="dataNascimento">Data de Nascimento</Label>
              <Input
                id="dataNascimento"
                name="dataNascimento"
                type="date"
                defaultValue={defaultValues?.dataNascimento ?? undefined}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="cpf">CPF</Label>
              <Input
                id="cpf"
                name="cpf"
                defaultValue={defaultValues?.cpf ?? undefined}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="contato">Contato</Label>
              <Input
                id="contato"
                name="contato"
                defaultValue={defaultValues?.contato ?? undefined}
              />
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="endereco">Endereço</Label>
            <Input
              id="endereco"
              name="endereco"
              defaultValue={defaultValues?.endereco ?? undefined}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Histórico clínico</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="historicoClinico">Histórico Clínico</Label>
            <Textarea
              id="historicoClinico"
              name="historicoClinico"
              defaultValue={defaultValues?.historicoClinico ?? undefined}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="objetivo">Objetivo</Label>
            <Textarea
              id="objetivo"
              name="objetivo"
              defaultValue={defaultValues?.objetivo ?? undefined}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="doencasPreexistentes">
              Doenças Pré-existentes
            </Label>
            <Textarea
              id="doencasPreexistentes"
              name="doencasPreexistentes"
              defaultValue={defaultValues?.doencasPreexistentes ?? undefined}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="cirurgiasAnteriores">Cirurgias Anteriores</Label>
            <Textarea
              id="cirurgiasAnteriores"
              name="cirurgiasAnteriores"
              defaultValue={defaultValues?.cirurgiasAnteriores ?? undefined}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="medicamentos">Medicamentos</Label>
            <Textarea
              id="medicamentos"
              name="medicamentos"
              defaultValue={defaultValues?.medicamentos ?? undefined}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Dados de Indicação</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-2">
            <Label htmlFor="pessoaIndicacao">Pessoa que Indicou</Label>
            <Input
              id="pessoaIndicacao"
              name="pessoaIndicacao"
              defaultValue={defaultValues?.pessoaIndicacao ?? undefined}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="numeroIndicacao">Contatos</Label>
            <Input
              id="numeroIndicacao"
              name="numeroIndicacao"
              defaultValue={defaultValues?.numeroIndicacao ?? undefined}
            />
          </div>
        </CardContent>
      </Card>

      {state.error && (
        <p className="text-sm text-destructive">{state.error}</p>
      )}

      <FormActions
        submitLabel={mode === "create" ? "Criar paciente" : "Salvar alterações"}
        onCancel={() => router.push("/pacientes")}
      />
    </form>
  );
}
