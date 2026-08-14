"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FormActions } from "@/components/ui/form-actions";
import type { UsuarioActionState } from "@/actions/usuarios";

const initialState: UsuarioActionState = {};

export function UsuarioForm({
  action,
  defaultValues,
  mode,
}: {
  action: (
    prevState: UsuarioActionState,
    formData: FormData,
  ) => Promise<UsuarioActionState>;
  defaultValues?: { name: string; email: string };
  mode: "create" | "edit";
}) {
  const router = useRouter();
  const [state, formAction] = useActionState(action, initialState);

  useEffect(() => {
    if (state.success) {
      toast.success(
        mode === "create"
          ? "Usuário criado com sucesso."
          : "Usuário atualizado com sucesso.",
      );
      router.push("/usuarios");
    }
  }, [state.success, mode, router]);

  return (
    <form action={formAction} className="flex max-w-md flex-col gap-4 pb-24">
      <div className="flex flex-col gap-2">
        <Label htmlFor="name">Nome</Label>
        <Input
          id="name"
          name="name"
          defaultValue={defaultValues?.name}
          required
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="email">E-mail</Label>
        <Input
          id="email"
          name="email"
          type="email"
          defaultValue={defaultValues?.email}
          required
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="password">
          Senha {mode === "edit" && "(deixe em branco para manter a atual)"}
        </Label>
        <Input
          id="password"
          name="password"
          type="password"
          required={mode === "create"}
        />
      </div>
      {state.error && (
        <p className="text-sm text-destructive">{state.error}</p>
      )}
      <FormActions
        submitLabel={mode === "create" ? "Criar usuário" : "Salvar alterações"}
        onCancel={() => router.push("/usuarios")}
      />
    </form>
  );
}
