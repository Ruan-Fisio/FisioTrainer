/**
 * Modelo de contrato: catálogo de variáveis, texto sugerido, substituição e divisão em
 * blocos. Puro e sem dependência de servidor (a tela de edição usa na pré-visualização).
 */

export type VariavelContrato = { chave: string; descricao: string; exemplo: string };

export const GRUPOS_VARIAVEIS: { titulo: string; variaveis: VariavelContrato[] }[] = [
  {
    titulo: "Paciente",
    variaveis: [
      { chave: "paciente.nome", descricao: "Nome", exemplo: "Maria da Silva" },
      { chave: "paciente.cpf", descricao: "CPF", exemplo: "123.456.789-01" },
      { chave: "paciente.data_nascimento", descricao: "Data de nascimento", exemplo: "10/05/1985" },
      { chave: "paciente.endereco", descricao: "Endereço", exemplo: "Rua das Flores, 100 - Centro" },
      { chave: "paciente.contato", descricao: "Telefone/contato", exemplo: "(28) 99999-0000" },
      { chave: "paciente.email", descricao: "E-mail", exemplo: "maria@exemplo.com" },
    ],
  },
  {
    titulo: "Clínica (contratada)",
    variaveis: [
      { chave: "contratada.nome", descricao: "Razão social ou nome", exemplo: "Clínica Exemplo LTDA" },
      { chave: "contratada.documento", descricao: "CPF/CNPJ", exemplo: "00.000.000/0001-00" },
      { chave: "contratada.inscricao_municipal", descricao: "Inscrição municipal", exemplo: "12345" },
      { chave: "contratada.endereco", descricao: "Endereço", exemplo: "Av. Principal, 200 - Centro" },
      { chave: "contratada.telefone", descricao: "Telefone", exemplo: "(28) 3333-0000" },
      { chave: "contratada.email", descricao: "E-mail", exemplo: "contato@exemplo.com" },
    ],
  },
  {
    titulo: "Plano contratado",
    variaveis: [
      { chave: "plano.nome", descricao: "Nome do plano", exemplo: "Plano Performance" },
      { chave: "plano.modalidades", descricao: "Modalidades", exemplo: "Fisioterapia" },
      { chave: "plano.atendimentos_mes", descricao: "Atendimentos por mês", exemplo: "8" },
      { chave: "plano.total_atendimentos", descricao: "Total de atendimentos no período", exemplo: "24" },
      { chave: "plano.periodicidade", descricao: "Periodicidade", exemplo: "Trimestral" },
      { chave: "plano.data_inicio", descricao: "Data de início", exemplo: "01/12/2026" },
      { chave: "plano.valor_original", descricao: "Valor antes do desconto", exemplo: "R$ 1.200,00" },
      { chave: "plano.desconto", descricao: "Desconto aplicado", exemplo: "R$ 100,00" },
      { chave: "plano.valor_total", descricao: "Valor total", exemplo: "R$ 1.100,00" },
      { chave: "plano.forma_pagamento", descricao: "Forma de pagamento", exemplo: "À vista" },
      { chave: "plano.numero_parcelas", descricao: "Número de parcelas", exemplo: "1" },
      {
        chave: "plano.parcelas",
        descricao: "Lista de parcelas com vencimento e valor",
        exemplo: "Parcela 1: vencimento em 01/12/2026, R$ 1.100,00",
      },
    ],
  },
  {
    titulo: "Contrato e regras",
    variaveis: [
      { chave: "contrato.numero", descricao: "Número do contrato", exemplo: "CT-000001" },
      { chave: "contrato.data_emissao", descricao: "Data de emissão", exemplo: "01/12/2026" },
      { chave: "regras.horas_cancelamento", descricao: "Antecedência para desmarcar, em horas", exemplo: "2" },
    ],
  },
];

const CHAVES_VALIDAS = new Set(
  GRUPOS_VARIAVEIS.flatMap((g) => g.variaveis.map((v) => v.chave)),
);

/** Valores fictícios para a pré-visualização na tela do modelo. */
export const VARIAVEIS_EXEMPLO: Record<string, string> = Object.fromEntries(
  GRUPOS_VARIAVEIS.flatMap((g) => g.variaveis.map((v) => [v.chave, v.exemplo])),
);

const REGEX_VARIAVEL = /\{\{\s*([\w.]+)\s*\}\}/g;

export function normalizarQuebras(texto: string) {
  return texto.replace(/\r\n?/g, "\n");
}

/**
 * Passada única: um valor que contenha `{{...}}` (ex. no nome do paciente) não é
 * substituído de novo. Chave sem valor fica como está.
 */
export function renderizarModelo(texto: string, variaveis: Record<string, string>) {
  return normalizarQuebras(texto).replace(REGEX_VARIAVEL, (original, chave: string) =>
    Object.hasOwn(variaveis, chave) ? variaveis[chave] : original,
  );
}

/** Variáveis usadas no texto que não existem no catálogo (provável erro de digitação). */
export function variaveisDesconhecidas(texto: string) {
  const usadas = [...texto.matchAll(REGEX_VARIAVEL)].map((m) => m[1]);
  return [...new Set(usadas)].filter((chave) => !CHAVES_VALIDAS.has(chave));
}

export type BlocoContrato = {
  tipo: "titulo" | "secao" | "paragrafo";
  texto: string;
};

/**
 * Marcação mínima, a mesma na tela e no PDF: `# ` título, `## ` seção; linhas seguidas
 * formam um parágrafo (com as quebras preservadas) e linha em branco separa parágrafos.
 */
export function blocosContrato(texto: string): BlocoContrato[] {
  const blocos: BlocoContrato[] = [];
  let paragrafo: string[] = [];

  const fecharParagrafo = () => {
    if (paragrafo.length > 0) blocos.push({ tipo: "paragrafo", texto: paragrafo.join("\n") });
    paragrafo = [];
  };

  for (const linhaCrua of normalizarQuebras(texto).split("\n")) {
    const linha = linhaCrua.trim();
    if (!linha) {
      fecharParagrafo();
    } else if (linha.startsWith("## ")) {
      fecharParagrafo();
      blocos.push({ tipo: "secao", texto: linha.slice(3).trim() });
    } else if (linha.startsWith("# ")) {
      fecharParagrafo();
      blocos.push({ tipo: "titulo", texto: linha.slice(2).trim() });
    } else {
      paragrafo.push(linha);
    }
  }
  fecharParagrafo();
  return blocos;
}

/** Rascunho inicial, montado com o que o sistema já sabe do plano. Revisar com um advogado. */
export const CONTRATO_MODELO_PADRAO = `# CONTRATO DE PRESTAÇÃO DE SERVIÇOS DE SAÚDE E PERFORMANCE

Contrato nº {{contrato.numero}}, emitido em {{contrato.data_emissao}}.

## PARTES

CONTRATADA: {{contratada.nome}}, inscrita no CPF/CNPJ sob o nº {{contratada.documento}}, com endereço em {{contratada.endereco}}, telefone {{contratada.telefone}} e e-mail {{contratada.email}}.

CONTRATANTE: {{paciente.nome}}, inscrito(a) no CPF sob o nº {{paciente.cpf}}, nascido(a) em {{paciente.data_nascimento}}, com endereço em {{paciente.endereco}}, telefone {{paciente.contato}} e e-mail {{paciente.email}}.

## CLÁUSULA 1 - DO OBJETO

1.1. Este contrato tem por objeto a prestação dos serviços do plano {{plano.nome}}, na(s) modalidade(s) {{plano.modalidades}}, por profissionais habilitados da CONTRATADA.

1.2. O plano tem periodicidade {{plano.periodicidade}}, início em {{plano.data_inicio}} e prevê até {{plano.atendimentos_mes}} atendimento(s) por mês, no total de {{plano.total_atendimentos}} atendimento(s) no período.

## CLÁUSULA 2 - DO VALOR E DO PAGAMENTO

2.1. O CONTRATANTE pagará à CONTRATADA o valor total de {{plano.valor_total}}, na forma {{plano.forma_pagamento}}, em {{plano.numero_parcelas}} parcela(s), conforme abaixo:

{{plano.parcelas}}

2.2. A nota fiscal do serviço está incluída no valor contratado.

## CLÁUSULA 3 - DOS AGENDAMENTOS E DESMARCAÇÕES

3.1. Os atendimentos são agendados conforme a disponibilidade de horários, de profissionais e de salas da CONTRATADA.

3.2. O CONTRATANTE pode desmarcar um atendimento com antecedência mínima de {{regras.horas_cancelamento}} hora(s) do início, de acordo com as regras de remarcação do plano. Fora desse prazo, o atendimento poderá ser considerado realizado.

## CLÁUSULA 4 - DAS OBRIGAÇÕES DAS PARTES

4.1. A CONTRATADA prestará os serviços com zelo e técnica, de acordo com as normas da profissão, sem garantir resultado específico, que depende também das condições de saúde e da adesão do CONTRATANTE.

4.2. O CONTRATANTE informará seu histórico de saúde de forma completa e verdadeira, seguirá as orientações dos profissionais e comunicará qualquer alteração em seu estado de saúde.

## CLÁUSULA 5 - DA VIGÊNCIA E DA RESCISÃO

5.1. Este contrato vigora pelo período do plano contratado e poderá ser renovado por novo plano atribuído ao CONTRATANTE.

5.2. Qualquer das partes poderá rescindir este contrato mediante comunicação à outra parte, respeitados os valores referentes aos serviços já prestados.

## CLÁUSULA 6 - DA PROTEÇÃO DE DADOS

6.1. A CONTRATADA tratará os dados pessoais e de saúde do CONTRATANTE para a execução deste contrato e para o cumprimento de obrigações legais e profissionais, nos termos da Lei nº 13.709/2018 (LGPD).

## CLÁUSULA 7 - DA ASSINATURA ELETRÔNICA

7.1. As partes reconhecem como válida a assinatura eletrônica deste contrato, nos termos do art. 10, § 2º, da Medida Provisória nº 2.200-2/2001 e da Lei nº 14.063/2020.

## CLÁUSULA 8 - DO FORO

8.1. Fica eleito o foro da comarca do domicílio do CONTRATANTE para resolver qualquer questão oriunda deste contrato.
`;
