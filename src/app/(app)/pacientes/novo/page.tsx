import { createPaciente } from "@/actions/pacientes";
import { buscarPreCadastroPendente } from "@/actions/pre-cadastros";
import { PacienteForm } from "@/components/pacientes/paciente-form";
import { mascararCelular } from "@/lib/telefone";

type PageProps = {
  searchParams: Promise<{ preCadastro?: string }>;
};

export default async function NovoPacientePage({ searchParams }: PageProps) {
  const { preCadastro: preCadastroId } = await searchParams;
  const preCadastro = preCadastroId
    ? await buscarPreCadastroPendente(preCadastroId)
    : null;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Novo paciente</h1>
        <p className="text-sm text-muted-foreground">
          {preCadastro
            ? "Complete os dados obtidos no contato para efetivar o pré-cadastro."
            : "Cadastre os dados e o histórico clínico do paciente."}
        </p>
      </div>
      <PacienteForm
        action={createPaciente}
        mode="create"
        preCadastroId={preCadastro?.id}
        defaultValues={
          preCadastro
            ? {
                nome: `${preCadastro.nome} ${preCadastro.sobrenome}`,
                sexo: null,
                idade: null,
                dataNascimento: null,
                cpf: null,
                email: null,
                contato: mascararCelular(preCadastro.celular),
                endereco: null,
                historicoClinico: preCadastro.queixaPrincipal,
                objetivo: null,
                doencasPreexistentes: null,
                cirurgiasAnteriores: null,
                medicamentos: null,
                numeroIndicacao: null,
                pessoaIndicacao: null,
              }
            : undefined
        }
      />
    </div>
  );
}
