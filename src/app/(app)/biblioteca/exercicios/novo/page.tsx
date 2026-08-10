import { createExercicio } from "@/actions/exercicios";
import { listAllCategorias } from "@/actions/categorias";
import { ExercicioForm } from "@/components/exercicios/exercicio-form";

export default async function NovoExercicioPage() {
  const categorias = await listAllCategorias();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Novo exercício</h1>
        <p className="text-sm text-muted-foreground">
          Cadastre um novo exercício na biblioteca.
        </p>
      </div>
      <ExercicioForm
        action={createExercicio}
        categoriaOptions={categorias}
        mode="create"
      />
    </div>
  );
}
