import { createPlano } from "@/actions/planos";
import { PlanoForm } from "@/components/planos/plano-form";

export default function NovoPlanoPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Novo plano</h1>
        <p className="text-sm text-muted-foreground">
          Cadastre um novo plano no catálogo.
        </p>
      </div>
      <PlanoForm action={createPlano} mode="create" />
    </div>
  );
}
