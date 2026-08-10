"use client";

import { useActionState, useEffect } from "react";
import { useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { CategoriaActionState } from "@/actions/categorias";

const initialState: CategoriaActionState = {};

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Salvando..." : label}
    </Button>
  );
}

export function CategoriaForm({
  action,
  defaultValues,
  mode,
}: {
  action: (
    prevState: CategoriaActionState,
    formData: FormData,
  ) => Promise<CategoriaActionState>;
  defaultValues?: { name: string };
  mode: "create" | "edit";
}) {
  const router = useRouter();
  const [state, formAction] = useActionState(action, initialState);

  useEffect(() => {
    if (state.success) {
      toast.success(
        mode === "create"
          ? "Categoria criada com sucesso."
          : "Categoria atualizada com sucesso.",
      );
      router.push("/biblioteca/categorias");
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
      {state.error && (
        <p className="text-sm text-destructive">{state.error}</p>
      )}
      <div className="flex gap-2">
        <SubmitButton
          label={mode === "create" ? "Criar categoria" : "Salvar alterações"}
        />
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push("/biblioteca/categorias")}
        >
          Cancelar
        </Button>
      </div>
    </form>
  );
}
