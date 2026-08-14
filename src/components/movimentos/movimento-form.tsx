"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FormActions } from "@/components/ui/form-actions";
import type { MovimentoActionState } from "@/actions/movimentos";

const initialState: MovimentoActionState = {};

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
    <form action={formAction} className="flex max-w-md flex-col gap-4 pb-24">
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
      <FormActions
        submitLabel={mode === "create" ? "Criar movimento" : "Salvar alterações"}
        onCancel={() => router.push("/biblioteca-movimento/goniometria")}
      />
    </form>
  );
}
