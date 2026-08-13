import { createMovimento } from "@/actions/movimentos";
import { MovimentoForm } from "@/components/movimentos/movimento-form";

export default function NovoMovimentoPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Novo movimento</h1>
        <p className="text-sm text-muted-foreground">
          Cadastre um novo movimento de goniometria.
        </p>
      </div>
      <MovimentoForm action={createMovimento} mode="create" />
    </div>
  );
}
