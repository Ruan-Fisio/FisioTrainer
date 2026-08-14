"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CategoriaSelect, type CategoriaOption } from "@/components/exercicios/categoria-select";
import { LinkPreviewCard } from "@/components/exercicios/link-preview-card";
import { FormActions } from "@/components/ui/form-actions";
import type { ExercicioActionState } from "@/actions/exercicios";

const initialState: ExercicioActionState = {};

export function ExercicioForm({
  action,
  categoriaOptions,
  defaultValues,
  mode,
}: {
  action: (
    prevState: ExercicioActionState,
    formData: FormData,
  ) => Promise<ExercicioActionState>;
  categoriaOptions: CategoriaOption[];
  defaultValues?: {
    name: string;
    categoriaIds: string[];
    links: string[];
  };
  mode: "create" | "edit";
}) {
  const router = useRouter();
  const [state, formAction] = useActionState(action, initialState);
  const [categoriaIds, setCategoriaIds] = useState<string[]>(
    defaultValues?.categoriaIds ?? [],
  );
  const [links, setLinks] = useState<string[]>(
    defaultValues?.links && defaultValues.links.length > 0
      ? defaultValues.links
      : [""],
  );

  useEffect(() => {
    if (state.success) {
      toast.success(
        mode === "create"
          ? "Exercício criado com sucesso."
          : "Exercício atualizado com sucesso.",
      );
      router.push("/biblioteca/exercicios");
    }
  }, [state.success, mode, router]);

  function updateLink(index: number, url: string) {
    setLinks((prev) => prev.map((link, i) => (i === index ? url : link)));
  }

  function removeLink(index: number) {
    setLinks((prev) => prev.filter((_, i) => i !== index));
  }

  function addLink() {
    setLinks((prev) => [...prev, ""]);
  }

  const validLinks = links.filter((url) => url.trim().length > 0);

  return (
    <form action={formAction} className="flex max-w-xl flex-col gap-6 pb-24">
      <input
        type="hidden"
        name="categoriaIds"
        value={JSON.stringify(categoriaIds)}
      />
      <input
        type="hidden"
        name="links"
        value={JSON.stringify(validLinks.map((url) => ({ url })))}
      />

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
        <Label>Categorias</Label>
        <CategoriaSelect
          options={categoriaOptions}
          value={categoriaIds}
          onChange={setCategoriaIds}
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label>Links</Label>
        <div className="flex flex-col gap-3">
          {links.map((url, index) => (
            <div key={index} className="flex flex-col gap-2">
              <div className="flex gap-2">
                <Input
                  placeholder="https://..."
                  value={url}
                  onChange={(event) => updateLink(index, event.target.value)}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => removeLink(index)}
                  disabled={links.length === 1}
                >
                  <X className="size-4" />
                  <span className="sr-only">Remover link</span>
                </Button>
              </div>
              {url.trim() && <LinkPreviewCard url={url.trim()} />}
            </div>
          ))}
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="w-fit"
          onClick={addLink}
        >
          <Plus />
          Adicionar link
        </Button>
      </div>

      {state.error && (
        <p className="text-sm text-destructive">{state.error}</p>
      )}

      <FormActions
        submitLabel={mode === "create" ? "Criar exercício" : "Salvar alterações"}
        onCancel={() => router.push("/biblioteca/exercicios")}
      />
    </form>
  );
}
