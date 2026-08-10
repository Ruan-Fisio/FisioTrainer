"use client";

import { useActionState, useEffect } from "react";
import { useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { UsuarioActionState } from "@/actions/usuarios";

const initialState: UsuarioActionState = {};

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Salvando..." : label}
    </Button>
  );
}

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
    <form action={formAction} className="flex max-w-md flex-col gap-4">
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
      <div className="flex gap-2">
        <SubmitButton
          label={mode === "create" ? "Criar usuário" : "Salvar alterações"}
        />
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push("/usuarios")}
        >
          Cancelar
        </Button>
      </div>
    </form>
  );
}
