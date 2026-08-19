"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  defaultValues?: {
    name: string;
    email: string;
    cref?: string | null;
    crefito?: string | null;
    cpfCnpj?: string | null;
    razaoSocial?: string | null;
    inscricaoMunicipal?: string | null;
    telefone?: string | null;
    endereco?: string | null;
  };
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
      <div className="flex flex-col gap-2">
        <Label htmlFor="cref">CREF (opcional)</Label>
        <Input id="cref" name="cref" defaultValue={defaultValues?.cref ?? ""} />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="crefito">CREFITO (opcional)</Label>
        <Input
          id="crefito"
          name="crefito"
          defaultValue={defaultValues?.crefito ?? ""}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Dados para nota fiscal</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <p className="text-xs text-muted-foreground">
            Usados para preencher o comprovante gerado ao emitir nota fiscal
            de uma cobrança.
          </p>
          <div className="flex flex-col gap-2">
            <Label htmlFor="razaoSocial">Razão social / Nome completo</Label>
            <Input
              id="razaoSocial"
              name="razaoSocial"
              defaultValue={defaultValues?.razaoSocial ?? ""}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="cpfCnpj">CPF ou CNPJ</Label>
            <Input
              id="cpfCnpj"
              name="cpfCnpj"
              defaultValue={defaultValues?.cpfCnpj ?? ""}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="inscricaoMunicipal">
              Inscrição municipal (opcional)
            </Label>
            <Input
              id="inscricaoMunicipal"
              name="inscricaoMunicipal"
              defaultValue={defaultValues?.inscricaoMunicipal ?? ""}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="telefone">Telefone</Label>
            <Input
              id="telefone"
              name="telefone"
              defaultValue={defaultValues?.telefone ?? ""}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="endereco">Endereço</Label>
            <Input
              id="endereco"
              name="endereco"
              defaultValue={defaultValues?.endereco ?? ""}
            />
          </div>
        </CardContent>
      </Card>

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
