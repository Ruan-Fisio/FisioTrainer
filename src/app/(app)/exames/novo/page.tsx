import { createExame } from "@/actions/exames";
import { ExameForm } from "@/components/exames/exame-form";

export default function NovoExamePage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Novo exame</h1>
        <p className="text-sm text-muted-foreground">
          Monte a estrutura do exame: seções, campos e colunas.
        </p>
      </div>
      <ExameForm action={createExame} mode="create" />
    </div>
  );
}
