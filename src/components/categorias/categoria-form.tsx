"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FormActions } from "@/components/ui/form-actions";
import type { CategoriaActionState } from "@/actions/categorias";

const initialState: CategoriaActionState = {};

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
    <form
      action={formAction}
      className="flex max-w-md flex-col gap-4 pb-24"
    >
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
      <FormActions
        submitLabel={mode === "create" ? "Criar categoria" : "Salvar alterações"}
        onCancel={() => router.push("/biblioteca/categorias")}
      />
    </form>
  );
}
