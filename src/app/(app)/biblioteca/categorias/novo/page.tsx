import { createCategoria } from "@/actions/categorias";
import { CategoriaForm } from "@/components/categorias/categoria-form";

export default function NovaCategoriaPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Nova categoria</h1>
        <p className="text-sm text-muted-foreground">
          Cadastre uma nova categoria de exercícios.
        </p>
      </div>
      <CategoriaForm action={createCategoria} mode="create" />
    </div>
  );
}
