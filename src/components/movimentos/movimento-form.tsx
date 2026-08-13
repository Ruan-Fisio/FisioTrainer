"use client";

import { useActionState, useEffect } from "react";
import { useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { MovimentoActionState } from "@/actions/movimentos";

const initialState: MovimentoActionState = {};

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Salvando..." : label}
    </Button>
  );
}

export function MovimentoForm({
  action,
  defaultValues,
  mode,
}: {
  action: (
    prevState: MovimentoActionState,
    formData: FormData,
  ) => Promise<MovimentoActionState>;
  defaultValues?: { nome: string; grauIdeal: string };
  mode: "create" | "edit";
}) {
  const router = useRouter();
  const [state, formAction] = useActionState(action, initialState);

  useEffect(() => {
    if (state.success) {
      toast.success(
        mode === "create"
          ? "Movimento criado com sucesso."
          : "Movimento atualizado com sucesso.",
      );
      router.push("/biblioteca-movimento/goniometria");
    }
  }, [state.success, mode, router]);

  return (
    <form action={formAction} className="flex max-w-md flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor="nome">Nome</Label>
        <Input
          id="nome"
          name="nome"
          defaultValue={defaultValues?.nome}
          required
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="grauIdeal">Grau ideal</Label>
        <Input
          id="grauIdeal"
          name="grauIdeal"
          defaultValue={defaultValues?.grauIdeal}
          required
        />
      </div>
      {state.error && (
        <p className="text-sm text-destructive">{state.error}</p>
      )}
      <div className="flex gap-2">
        <SubmitButton
          label={mode === "create" ? "Criar movimento" : "Salvar alterações"}
        />
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push("/biblioteca-movimento/goniometria")}
        >
          Cancelar
        </Button>
      </div>
    </form>
  );
}
