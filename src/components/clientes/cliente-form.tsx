"use client";

import { useActionState, useEffect } from "react";
import { useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ClienteActionState } from "@/actions/clientes";

const initialState: ClienteActionState = {};

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Salvando..." : label}
    </Button>
  );
}

export function ClienteForm({
  action,
  defaultValues,
  mode,
}: {
  action: (
    prevState: ClienteActionState,
    formData: FormData,
  ) => Promise<ClienteActionState>;
  defaultValues?: {
    nome: string;
    idade: number | null;
    cpf: string | null;
    contato: string | null;
    historicoClinico: string | null;
    objetivo: string | null;
    doencasPreexistentes: string | null;
    cirurgiasAnteriores: string | null;
    medicamentos: string | null;
  };
  mode: "create" | "edit";
}) {
  const router = useRouter();
  const [state, formAction] = useActionState(action, initialState);

  useEffect(() => {
    if (state.success) {
      toast.success(
        mode === "create"
          ? "Cliente criado com sucesso."
          : "Cliente atualizado com sucesso.",
      );
      router.push("/clientes");
    }
  }, [state.success, mode, router]);

  return (
    <form action={formAction} className="flex max-w-2xl flex-col gap-6">
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
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
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

      {state.error && (
        <p className="text-sm text-destructive">{state.error}</p>
      )}

      <div className="flex gap-2">
        <SubmitButton
          label={mode === "create" ? "Criar cliente" : "Salvar alterações"}
        />
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push("/clientes")}
        >
          Cancelar
        </Button>
      </div>
    </form>
  );
}
