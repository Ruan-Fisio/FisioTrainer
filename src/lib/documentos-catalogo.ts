/**
 * Catálogo dos documentos clínicos emitidos a partir dos modelos PDF preenchíveis
 * (AcroForm) em `src/assets/documentos/`. Cada campo aqui corresponde a um campo do
 * PDF com o MESMO nome e o mesmo limite de caracteres — `documentos-catalogo.test.ts`
 * confere isso contra os arquivos. Ver `docs/documentos.md`.
 */

export type TipoCampoDocumento = "texto" | "textarea" | "checkbox" | "data" | "hora";

/** De onde vem o valor inicial de um campo ao criar um documento. */
export type PrefillDocumento =
  | "paciente.nome"
  | "paciente.nascimento"
  | "paciente.documento"
  | "hoje";

/**
 * Dados do profissional que se repetem entre documentos: o valor do último documento
 * emitido (de qualquer tipo) vira o valor inicial do próximo.
 */
export type LembrarDocumento =
  | "local"
  | "endereco"
  | "contato"
  | "enderecoContato"
  | "localAtendimento"
  | "cidadeUf"
  | "cep";

export type CampoDocumento = {
  /** Nome do campo no AcroForm. */
  nome: string;
  label: string;
  tipo: TipoCampoDocumento;
  /** Limite de caracteres do campo no PDF (só texto/textarea). */
  max?: number;
  ajuda?: string;
  prefill?: PrefillDocumento;
  lembrar?: LembrarDocumento;
  /** Ocupa a linha inteira no formulário (textos longos). */
  largo?: boolean;
};

export type SecaoDocumento = { titulo: string; descricao?: string; campos: CampoDocumento[] };

export type CategoriaDocumento =
  | "Encaminhamentos e solicitações"
  | "Atestados e declarações"
  | "Relatórios e alta"
  | "Termos e registros";

export const CATEGORIAS_DOCUMENTO: CategoriaDocumento[] = [
  "Encaminhamentos e solicitações",
  "Atestados e declarações",
  "Relatórios e alta",
  "Termos e registros",
];

export type TipoDocumento = {
  slug: string;
  titulo: string;
  descricao: string;
  categoria: CategoriaDocumento;
  /** Arquivo em `src/assets/documentos/`. */
  arquivo: string;
  /** Páginas (0-based) do modelo que compõem o documento — páginas de apoio ficam fora. */
  paginas: number[];
  /** Campo cujo valor aparece como subtítulo na listagem (ex.: destino do encaminhamento). */
  resumo?: string;
  secoes: SecaoDocumento[];
};

// ---- construtores curtos ----
const t = (nome: string, label: string, max: number, extra: Partial<CampoDocumento> = {}): CampoDocumento => ({
  nome, label, tipo: "texto", max, ...extra,
});
const ta = (nome: string, label: string, max: number, extra: Partial<CampoDocumento> = {}): CampoDocumento => ({
  nome, label, tipo: "textarea", max, largo: true, ...extra,
});
const cb = (nome: string, label: string): CampoDocumento => ({ nome, label, tipo: "checkbox" });
const d = (nome: string, label: string, extra: Partial<CampoDocumento> = {}): CampoDocumento => ({
  nome, label, tipo: "data", max: 10, ...extra,
});
const h = (nome: string, label: string): CampoDocumento => ({ nome, label, tipo: "hora", max: 5 });

const nomeCompleto = (nome: string, max = 100) => t(nome, "Nome completo", max, { prefill: "paciente.nome", largo: true });
const nomeSocial = (nome: string, max: number) => t(nome, "Nome social (se houver)", max);
const nascimento = (nome: string) => d(nome, "Nascimento", { prefill: "paciente.nascimento" });
const emissao = (nome: string, label = "Data") => d(nome, label, { prefill: "hoje" });
const localEmissao = (nome: string, label = "Local de emissão") => t(nome, label, 70, { lembrar: "local" });
const enderecoContato = (nome: string, max: number) =>
  t(nome, "Endereço / contato profissional", max, { lembrar: "enderecoContato", largo: true });

export const TIPOS_DOCUMENTO: TipoDocumento[] = [
  // ---------------- Encaminhamentos e solicitações ----------------
  {
    slug: "encaminhamento-multiprofissional",
    titulo: "Encaminhamento multiprofissional",
    descricao: "Encaminhar o paciente a outro profissional ou serviço, com pedido de contrarreferência.",
    categoria: "Encaminhamentos e solicitações",
    arquivo: "encaminhamento-multiprofissional.pdf",
    paginas: [0],
    resumo: "destino_profissional",
    secoes: [
      {
        titulo: "Identificação do paciente",
        campos: [
          nomeCompleto("paciente_nome"),
          nomeSocial("paciente_nome_social", 80),
          nascimento("paciente_nascimento"),
          t("paciente_identificador", "CNS / prontuário (se necessário)", 25),
          emissao("data_emissao"),
        ],
      },
      {
        titulo: "Destino e finalidade",
        campos: [
          t("destino_profissional", "Profissional / especialidade", 100, { largo: true }),
          t("destino_servico", "Serviço / unidade", 100, { largo: true }),
          cb("finalidade_avaliacao", "Finalidade: avaliação"),
          cb("finalidade_acompanhamento", "Finalidade: acompanhamento"),
          cb("finalidade_cuidado_compartilhado", "Finalidade: cuidado compartilhado"),
        ],
      },
      {
        titulo: "Motivo e objetivo do encaminhamento",
        campos: [
          ta("motivo_objetivo", "Objetivo do encaminhamento", 180, {
            ajuda: "Encaminho o(a) paciente para avaliação e conduta em sua área, com o seguinte objetivo:",
          }),
        ],
      },
      {
        titulo: "Resumo clínico e funcional",
        campos: [
          ta("resumo_clinico_funcional", "Resumo clínico e funcional", 320, {
            ajuda: "Queixa/evolução; achados e limitações; condições ou diagnósticos documentados (com fonte).",
          }),
        ],
      },
      {
        titulo: "Condutas e informações complementares",
        campos: [
          ta("condutas_informacoes", "Condutas e informações complementares", 180, {
            ajuda: "Intervenções e resposta; cuidados/restrições; medicações relevantes; exames/anexos com datas.",
          }),
          t("contato_retorno", "Contato para retorno", 65, { lembrar: "contato", largo: true }),
        ],
      },
    ],
  },
  {
    slug: "solicitacao-exames",
    titulo: "Solicitação de exames complementares",
    descricao: "Solicitar exames para subsidiar a avaliação e a conduta fisioterapêutica.",
    categoria: "Encaminhamentos e solicitações",
    arquivo: "solicitacao-exames.pdf",
    paginas: [0],
    resumo: "exame_1",
    secoes: [
      {
        titulo: "Identificação do paciente",
        campos: [
          nomeCompleto("paciente_nome"),
          nomeSocial("paciente_nome_social", 80),
          nascimento("paciente_nascimento"),
          t("paciente_identificador", "CNS / prontuário (se necessário)", 25),
          emissao("data_emissao"),
        ],
      },
      {
        titulo: "Exames solicitados",
        descricao: "Solicito os exames abaixo para subsidiar a avaliação e a conduta fisioterapêutica.",
        campos: [1, 2, 3, 4, 5, 6].flatMap((n) => [
          t(`exame_${n}`, `Exame / procedimento ${n}`, 110),
          t(`especificacao_${n}`, `Região / lado / especificação ${n}`, 70),
        ]),
      },
      {
        titulo: "Indicação clínica e justificativa",
        campos: [
          ta("justificativa_clinica", "Indicação clínica e justificativa", 300, {
            ajuda: "Queixa/evolução, achados, hipótese fisioterapêutica e questão que o exame deverá esclarecer.",
          }),
        ],
      },
      {
        titulo: "Informações relevantes ao serviço executor",
        campos: [
          ta("informacoes_executor", "Informações ao serviço executor", 180, {
            ajuda: "Exames prévios (com datas), restrições e outros dados pertinentes à realização dos exames.",
          }),
          t("local_atendimento", "Local de atendimento / endereço", 140, { lembrar: "localAtendimento", largo: true }),
          t("cidade_uf", "Cidade / UF", 60, { lembrar: "cidadeUf" }),
          t("cep_atendimento", "CEP", 9, { lembrar: "cep" }),
          t("contato_profissional", "Contato profissional", 100, { lembrar: "contato", largo: true }),
        ],
      },
    ],
  },
  {
    slug: "solicitacao-prorrogacao",
    titulo: "Solicitação de continuidade / prorrogação",
    descricao: "Pedir ao convênio/operadora a continuidade do tratamento fisioterapêutico.",
    categoria: "Encaminhamentos e solicitações",
    arquivo: "solicitacao-prorrogacao.pdf",
    paginas: [0],
    resumo: "pror_destinatario",
    secoes: [
      {
        titulo: "Identificação e destinatário",
        campos: [
          nomeCompleto("pror_paciente"),
          nomeSocial("pror_nome_social", 70),
          nascimento("pror_nascimento"),
          t("pror_destinatario", "Destinatário / operadora", 110, { largo: true }),
          t("pror_referencia", "Beneficiário / guia / referência (se aplicável)", 90, { largo: true }),
        ],
      },
      {
        titulo: "Quadro clínico e evolução",
        campos: [
          t("pror_diagnostico", "Diagnóstico fisioterapêutico", 140, { largo: true }),
          t("pror_periodo", "Período acompanhado", 40),
          t("pror_realizados", "Sessões realizadas", 5),
          ta("pror_evolucao", "Evolução", 250, {
            ajuda: "Sintetize o tratamento realizado e compare achados, testes e medidas com as respectivas datas.",
          }),
        ],
      },
      {
        titulo: "Justificativa clínica da continuidade",
        campos: [
          ta("pror_justificativa", "Justificativa", 250, {
            ajuda: "Indicação atual, limitações persistentes, prognóstico e benefícios esperados com a continuidade.",
          }),
        ],
      },
      {
        titulo: "Plano solicitado e objetivos",
        campos: [
          t("pror_quantidade", "Nº de atendimentos", 5),
          t("pror_frequencia", "Frequência", 60),
          t("pror_periodo_solicitado", "Período solicitado", 45),
          t("pror_reavaliacao", "Reavaliar em", 20),
          ta("pror_plano", "Plano", 250, {
            ajuda: "Procedimentos propostos, dosagem, objetivos mensuráveis e critérios para revisão do plano ou alta.",
          }),
        ],
      },
      {
        titulo: "Emissão",
        campos: [localEmissao("pror_local"), emissao("pror_data"), enderecoContato("pror_contato", 110)],
      },
    ],
  },

  // ---------------- Atestados e declarações ----------------
  {
    slug: "atestado-fisioterapeutico",
    titulo: "Atestado fisioterapêutico",
    descricao: "Atestar capacidade funcional, afastamento ou adaptação de atividades.",
    categoria: "Atestados e declarações",
    arquivo: "atestado-fisioterapeutico.pdf",
    paginas: [0],
    resumo: "finalidade_destinatario",
    secoes: [
      {
        titulo: "Identificação e finalidade",
        campos: [
          nomeCompleto("paciente_nome"),
          nomeSocial("paciente_nome_social", 80),
          nascimento("paciente_nascimento"),
          t("paciente_documento", "Documento (se necessário)", 30, { prefill: "paciente.documento" }),
          d("data_avaliacao", "Avaliação em", { prefill: "hoje" }),
          t("finalidade_destinatario", "Finalidade / destinatário", 110, { largo: true }),
        ],
      },
      {
        titulo: "Atestado",
        descricao:
          "Atesto, a pedido do(a) interessado(a), que a pessoa acima identificada foi avaliada por mim na data indicada e apresenta a condição físico-funcional abaixo, registrada em prontuário.",
        campos: [
          ta("conclusao_funcional", "Conclusão sobre a capacidade funcional", 180),
          cb("indicacao_afastamento", "Necessidade de afastamento temporário das atividades especificadas"),
          cb("indicacao_adaptacao", "Necessidade de adaptação/restrição das atividades especificadas"),
          cb("indicacao_outra", "Outra conclusão funcional (especificar abaixo)"),
          ta("atividades_indicacao", "Atividades abrangidas, alcance da indicação e condições pertinentes", 180),
        ],
      },
      {
        titulo: "Período",
        campos: [
          t("periodo_quantidade", "Período (quantidade)", 20),
          cb("unidade_dias", "Em dias"),
          cb("unidade_horas", "Em horas"),
          t("data_reavaliacao", "Reavaliar em", 20),
          t("periodo_inicio", "Início (data/horário)", 25),
          t("periodo_termino", "Término (data/horário)", 25),
        ],
      },
      {
        titulo: "Emissão",
        campos: [
          localEmissao("local_emissao"),
          emissao("data_emissao"),
          t("endereco_profissional", "Endereço profissional", 140, { lembrar: "endereco", largo: true }),
          t("contato_profissional", "Contato profissional", 100, { lembrar: "contato", largo: true }),
        ],
      },
    ],
  },
  {
    slug: "declaracao-comparecimento",
    titulo: "Declaração de comparecimento",
    descricao: "Comprovar presença em atendimento, com data e horários.",
    categoria: "Atestados e declarações",
    arquivo: "declaracao-comparecimento.pdf",
    paginas: [0],
    secoes: [
      {
        titulo: "Identificação do paciente",
        campos: [
          nomeCompleto("comparecimento_paciente"),
          t("comparecimento_nome_social", "Nome social (se houver)", 100, { largo: true }),
          t("comparecimento_documento", "Documento de identificação (se necessário)", 40, {
            prefill: "paciente.documento",
          }),
        ],
      },
      {
        titulo: "Registro do comparecimento",
        campos: [
          d("comparecimento_data_atendimento", "Data do atendimento", { prefill: "hoje" }),
          h("comparecimento_entrada", "Horário de entrada"),
          h("comparecimento_saida", "Horário de saída"),
          t("comparecimento_local_atendimento", "Local do atendimento", 120, {
            lembrar: "localAtendimento",
            largo: true,
          }),
        ],
      },
      {
        titulo: "Emissão e identificação profissional",
        campos: [
          localEmissao("comparecimento_local_emissao"),
          emissao("comparecimento_data_emissao"),
          t("comparecimento_endereco", "Endereço profissional", 120, { lembrar: "endereco", largo: true }),
          t("comparecimento_contato", "Contato profissional", 100, { lembrar: "contato", largo: true }),
        ],
      },
    ],
  },

  // ---------------- Relatórios e alta ----------------
  {
    slug: "relatorio-tecnico",
    titulo: "Relatório técnico fisioterapêutico",
    descricao: "Avaliação, diagnóstico, plano terapêutico e evolução do paciente.",
    categoria: "Relatórios e alta",
    arquivo: "relatorio-parecer.pdf",
    paginas: [0],
    resumo: "rel_finalidade",
    secoes: [
      {
        titulo: "Identificação e finalidade",
        campos: [
          nomeCompleto("rel_paciente_nome"),
          nomeSocial("rel_nome_social", 80),
          nascimento("rel_nascimento"),
          d("rel_admissao", "Admissão em"),
          t("rel_periodo", "Período relatado", 40),
          t("rel_finalidade", "Solicitante / finalidade", 110, { largo: true }),
        ],
      },
      {
        titulo: "Conteúdo",
        campos: [
          ta("rel_historia_avaliacao", "História e avaliação físico-funcional", 320, {
            ajuda: "Queixa/evolução, antecedentes pertinentes, métodos, achados e exames relevantes, com datas.",
          }),
          ta("rel_diagnostico", "Diagnóstico fisioterapêutico", 180, {
            ajuda: "Repercussões em funções e atividades; capacidade funcional e classificação utilizada, se pertinente.",
          }),
          ta("rel_plano", "Objetivos e plano terapêutico", 180, {
            ajuda: "Objetivos mensuráveis, intervenções, dosagem, frequência e período de acompanhamento.",
          }),
          ta("rel_evolucao_conclusao", "Evolução e conclusão técnica", 260, {
            ajuda: "Resultados, intercorrências, prognóstico quando sustentado e indicação de continuidade/alta/encaminhamento.",
          }),
        ],
      },
      {
        titulo: "Emissão",
        campos: [localEmissao("rel_local"), emissao("rel_data"), enderecoContato("rel_endereco_contato", 140)],
      },
    ],
  },
  {
    slug: "parecer-tecnico",
    titulo: "Parecer técnico fisioterapêutico",
    descricao: "Análise fundamentada para responder a uma demanda ou questão técnica.",
    categoria: "Relatórios e alta",
    arquivo: "relatorio-parecer.pdf",
    paginas: [1],
    resumo: "par_objeto",
    secoes: [
      {
        titulo: "Demanda e identificação",
        campos: [
          t("par_solicitante", "Solicitante / destinatário", 110, { largo: true }),
          t("par_objeto", "Objeto / assunto", 120, { largo: true }),
          t("par_pessoa_instituicao", "Pessoa / instituição analisada (se pertinente)", 90, {
            prefill: "paciente.nome",
            largo: true,
          }),
          t("par_documento", "Documento / referência", 50),
          t("par_data_base", "Data-base", 20),
        ],
      },
      {
        titulo: "Conteúdo",
        campos: [
          ta("par_quesitos", "Quesitos / questão técnica", 180, {
            ajuda: "Identificar com precisão o que foi solicitado e os pontos que deverão ser respondidos.",
          }),
          ta("par_fatos", "Relato dos fatos e elementos considerados", 180, {
            ajuda: "Documentos, avaliações e datas; distinguir informações relatadas de constatações próprias.",
          }),
          ta("par_analise", "Análise técnico-científica", 250, {
            ajuda: "Relacionar os elementos aos critérios e evidências pertinentes; explicitar limites e citar fontes.",
          }),
          ta("par_conclusao", "Conclusão e resposta aos quesitos", 180, {
            ajuda: "Responder ao que foi perguntado, indicando fundamentos, alcance e condições da conclusão.",
          }),
          ta("par_referencias", "Referências técnicas / anexos", 180),
        ],
      },
      {
        titulo: "Emissão",
        campos: [localEmissao("par_local"), emissao("par_data"), enderecoContato("par_endereco_contato", 140)],
      },
    ],
  },
  {
    slug: "alta-fisioterapeutica",
    titulo: "Alta fisioterapêutica e continuidade",
    descricao: "Conceder alta e encaminhar para atividades físicas orientadas.",
    categoria: "Relatórios e alta",
    arquivo: "alta-fisioterapeutica.pdf",
    paginas: [0],
    resumo: "alta_destinatario",
    secoes: [
      {
        titulo: "Identificação e episódio assistencial",
        campos: [
          nomeCompleto("alta_paciente"),
          nomeSocial("alta_nome_social", 70),
          nascimento("alta_nascimento"),
          t("alta_periodo", "Período de tratamento", 40),
          d("alta_data", "Alta em", { prefill: "hoje" }),
          t("alta_diagnostico", "Diagnóstico fisioterapêutico", 130, { largo: true }),
        ],
      },
      {
        titulo: "Reavaliação e critérios de alta",
        campos: [
          ta("alta_criterios", "Critérios de alta", 270, {
            ajuda: "Datas, testes/medidas, resultados comparativos e alcance dos objetivos pactuados com o paciente.",
          }),
        ],
      },
      {
        titulo: "Continuidade em atividades físicas orientadas",
        campos: [
          t("alta_destinatario", "Destinatário / serviço", 110, { largo: true }),
          ta("alta_objetivos_cuidados", "Objetivos, adaptações e cuidados", 250, {
            ajuda: "Capacidades a desenvolver, limitações e condições de progressão.",
          }),
        ],
      },
      {
        titulo: "Orientações e acompanhamento",
        campos: [
          t("alta_retorno", "Reavaliação, se indicada (prazo / critério)", 100, { largo: true }),
          localEmissao("alta_local"),
          emissao("alta_emissao"),
          enderecoContato("alta_contato", 110),
        ],
      },
    ],
  },

  // ---------------- Termos e registros ----------------
  {
    slug: "tcle",
    titulo: "Termo de consentimento livre e esclarecido (TCLE)",
    descricao: "Consentimento do paciente para o tratamento fisioterapêutico proposto.",
    categoria: "Termos e registros",
    arquivo: "tcle.pdf",
    paginas: [0, 1],
    secoes: [
      {
        titulo: "Identificação",
        campos: [
          nomeCompleto("tcle_paciente"),
          nomeSocial("tcle_nome_social", 70),
          nascimento("tcle_nascimento"),
          t("tcle_documento", "Documento de identificação", 30, { prefill: "paciente.documento" }),
          t("tcle_prontuario", "Prontuário nº", 25),
          enderecoContato("tcle_contato", 110),
        ],
      },
      {
        titulo: "Condição avaliada e tratamento proposto",
        campos: [
          ta("tcle_condicao", "Condição avaliada", 180, {
            ajuda: "Explique o diagnóstico fisioterapêutico e o motivo do tratamento em linguagem compreensível.",
          }),
          ta("tcle_proposta", "Tratamento proposto", 270, {
            ajuda: "Descreva o que será feito, região do corpo, finalidade, frequência e duração estimadas.",
          }),
        ],
      },
      {
        titulo: "Benefícios, riscos e alternativas",
        campos: [
          ta("tcle_beneficios", "Benefícios esperados e limitações", 180, {
            ajuda: "Registre objetivos, benefícios e evolução esperada, considerando as limitações do caso.",
          }),
          ta("tcle_riscos", "Riscos, desconfortos e cuidados", 350, {
            ajuda: "Informe riscos relevantes, fatores individuais, medidas de prevenção e sinais para interromper ou avisar.",
          }),
          ta("tcle_alternativas", "Alternativas e possibilidade de não tratar", 250, {
            ajuda: "Descreva alternativas pertinentes e possíveis consequências de adiar, recusar ou interromper o cuidado.",
          }),
        ],
      },
      {
        titulo: "Representante legal e emissão",
        descricao: "Representante legal, quando aplicável.",
        campos: [
          t("tcle_representante", "Nome do representante", 100, { largo: true }),
          t("tcle_rep_documento", "Documento do representante", 30),
          t("tcle_rep_vinculo", "Vínculo", 35),
          t("tcle_apoio_leitura", "Apoio à leitura / comunicação, se necessário", 100, { largo: true }),
          localEmissao("tcle_local", "Local"),
          emissao("tcle_data"),
        ],
      },
    ],
  },
  {
    slug: "autorizacao-imagem",
    titulo: "Autorização de imagem e voz",
    descricao: "Autorização para uso de fotos, vídeos e áudios (LGPD).",
    categoria: "Termos e registros",
    arquivo: "autorizacao-imagem.pdf",
    paginas: [0],
    secoes: [
      {
        titulo: "Clínica",
        campos: [
          t("curto_contato_clinica", "Endereço / contato da clínica", 140, { lembrar: "enderecoContato", largo: true }),
        ],
      },
      {
        titulo: "Dados do paciente",
        campos: [
          t("curto_paciente", "Nome do paciente", 110, { prefill: "paciente.nome", largo: true }),
          t("curto_documento", "Documento", 35, { prefill: "paciente.documento" }),
          nascimento("curto_nascimento"),
          t("curto_responsavel", "Responsável legal (somente se necessário)", 100, { largo: true }),
          t("curto_responsavel_documento", "Vínculo / documento do responsável", 100, { largo: true }),
        ],
      },
      {
        titulo: "Escolhas de divulgação",
        campos: [
          cb("curto_foto", "Mídia: fotos"),
          cb("curto_video", "Mídia: vídeos"),
          cb("curto_audio", "Mídia: voz / áudios"),
          cb("curto_institucional", "Finalidade: divulgar serviços"),
          cb("curto_educacao", "Finalidade: orientação em saúde"),
          cb("curto_publicidade", "Finalidade: publicidade"),
          cb("curto_redes", "Canal: redes sociais"),
          cb("curto_site", "Canal: site"),
          cb("curto_impressos", "Canal: impressos"),
          cb("curto_anuncios", "Canal: anúncios pagos"),
          t("curto_canais", "Perfis / site / materiais", 160, { largo: true }),
          ta("curto_material", "Conteúdo, datas de captação, dados de saúde e restrições de uso", 180),
          cb("curto_saude", "Autorizo divulgar somente os dados de saúde descritos acima"),
          cb("curto_identificavel", "Permito rosto / voz reconhecíveis"),
          t("curto_nome_publico", "Nome a divulgar", 80, {
            ajuda: "Sem marcação, ocultar rosto/voz; nome só se preenchido. Anúncios exigem marcar Publicidade.",
          }),
          d("curto_inicio", "Autorização de", { prefill: "hoje" }),
          d("curto_fim", "Até"),
        ],
      },
      {
        titulo: "Emissão",
        campos: [localEmissao("curto_local", "Local"), emissao("curto_data")],
      },
    ],
  },
  {
    slug: "registro-recusa",
    titulo: "Registro de recusa / interrupção do tratamento",
    descricao: "Registrar recusa de conduta ou interrupção do acompanhamento.",
    categoria: "Termos e registros",
    arquivo: "registro-recusa.pdf",
    paginas: [0],
    secoes: [
      {
        titulo: "Identificação",
        campos: [
          nomeCompleto("rec_paciente"),
          nomeSocial("rec_nome_social", 70),
          nascimento("rec_nascimento"),
          t("rec_representante", "Representante legal", 90),
          t("rec_vinculo", "Vínculo", 35),
          d("rec_data_ocorrencia", "Data do registro", { prefill: "hoje" }),
          t("rec_canal", "Canal / contexto", 80),
        ],
      },
      {
        titulo: "Situação e fatos registrados",
        campos: [
          cb("rec_tipo_recusa", "Recusa de conduta / tratamento"),
          cb("rec_tipo_interrupcao", "Interrupção por decisão expressa"),
          cb("rec_tipo_sem_confirmacao", "Interrupção do acompanhamento sem confirmação da decisão"),
          ta("rec_fatos", "Fatos registrados", 250, {
            ajuda: "Descreva a conduta, os fatos e datas, o alcance da decisão e os motivos, quando informados.",
          }),
        ],
      },
      {
        titulo: "Esclarecimentos e continuidade",
        campos: [
          ta("rec_esclarecimentos", "Esclarecimentos e alternativas", 250, {
            ajuda: "Registre o que foi explicado, alternativas e compreensão verificada; se não houve contato, informe.",
          }),
          ta("rec_orientacoes_contatos", "Orientações e continuidade do cuidado", 250, {
            ajuda: "Orientações, retorno/encaminhamentos e tentativas de contato, com datas, canal e resultado.",
          }),
          t("rec_motivo_sem_assinatura", "Se a assinatura não foi obtida, motivo", 130, { largo: true }),
        ],
      },
      {
        titulo: "Emissão",
        campos: [localEmissao("rec_local"), emissao("rec_emissao"), enderecoContato("rec_contato_profissional", 110)],
      },
    ],
  },
];

const POR_SLUG = new Map(TIPOS_DOCUMENTO.map((tipo) => [tipo.slug, tipo]));

export function tipoDocumento(slug: string): TipoDocumento | undefined {
  return POR_SLUG.get(slug);
}

export function camposDoTipo(tipo: TipoDocumento): CampoDocumento[] {
  return tipo.secoes.flatMap((s) => s.campos);
}

/** Valores salvos de um documento: texto/data/hora → string; checkbox → boolean. */
export type ValoresDocumento = Record<string, string | boolean>;

/** Texto de resumo do documento para listagens (ex.: destino do encaminhamento). */
export function resumoDocumento(tipo: TipoDocumento, valores: ValoresDocumento): string | null {
  if (!tipo.resumo) return null;
  const v = valores[tipo.resumo];
  return typeof v === "string" && v.trim() ? v.trim() : null;
}
