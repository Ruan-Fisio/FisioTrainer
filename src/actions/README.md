# src/actions

## Overview

`src/actions` is the Next.js Server Actions RPC layer (`"use server"` directive in all 33 modules) for FisioTrainer. It exposes all authenticated clinic staff workflows, dual-mode staff/patient-portal queries and scheduling mutations, token-gated patient portal wrappers, public pre-registration/contract-signing flows, and credential login. Actions validate input via Zod schemas or domain validators, enforce authorization (`exigirSessao`, `exigirSessaoOuPortal`, or token/CPF gates), coordinate Prisma database reads/writes and `$transaction` boundaries, manage Cloudflare R2 object lifecycles and signed URLs, render signed contract PDFs, and invalidate Next.js route caches via `revalidatePath`.

## Interface

All 33 files declare module-level `"use server"` (or `'use server'`) on line 1. There are no child subdirectories in `src/actions`.

### Authentication, Users & Audit Logs

- **`acessos-compartilhados.ts`** (`"use server"`):
  - `[acessos-compartilhados.ts:getOuCriarAcessoPaciente]`: `(pacienteId: string) => Promise<AcessoCompartilhadoPaciente>`
  - `[acessos-compartilhados.ts:revogarAcessoPaciente]`: `(acessoId: string) => Promise<{ success: true }>`
  - `[acessos-compartilhados.ts:listarAcessosPaciente]`: `(pacienteId: string) => Promise<AcessoCompartilhadoPaciente[]>`
- **`auth.ts`** (`"use server"`):
  - `[auth.ts:LoginState]`: `type { error?: string }`
  - `[auth.ts:loginAction]`: `(_prevState: LoginState, formData: FormData) => Promise<LoginState>`
- **`logs.ts`** (`"use server"`):
  - `[logs.ts:LogFilters]`: `type { q?: string; modulos?: string[]; acoes?: string[]; de?: string; ate?: string }`
  - `[logs.ts:listLogs]`: `(filters: LogFilters, page: number) => Promise<{ logs, total, totalPages, page }>`
- **`usuarios.ts`** (`"use server"`):
  - `[usuarios.ts:UsuarioActionState]`: `type { error?: string; success?: boolean }`
  - `[usuarios.ts:listAllUsuarios]`: `() => Promise<Array<{ id: string; name: string }>>`
  - `[usuarios.ts:listUsuarios]`: `(filters: { q?: string }, page: number) => Promise<{ usuarios, total, totalPages, page }>`
  - `[usuarios.ts:createUsuario]`: `(_prevState: UsuarioActionState, formData: FormData) => Promise<UsuarioActionState>`
  - `[usuarios.ts:updateUsuario]`: `(id: string, _prevState: UsuarioActionState, formData: FormData) => Promise<UsuarioActionState>`
  - `[usuarios.ts:deleteUsuario]`: `(id: string) => Promise<void>`

### Patients, Intake, Documents, Clinical Notes & Attachments

- **`pacientes.ts`** (`"use server"`):
  - `[pacientes.ts:PacienteActionState]`: `type { error?: string; success?: boolean }`
  - `[pacientes.ts:listPacientes]`: `(filters: { q?: string; excluidos?: boolean }, page: number) => Promise<{ pacientes, total, totalPages, page }>`
  - `[pacientes.ts:listAllPacientes]`: `() => Promise<Array<{ id: string; nome: string }>>`
  - `[pacientes.ts:createPaciente]`: `(_prevState: PacienteActionState, formData: FormData) => Promise<PacienteActionState>`
  - `[pacientes.ts:updatePaciente]`: `(id: string, _prevState: PacienteActionState, formData: FormData) => Promise<PacienteActionState>`
  - `[pacientes.ts:deletePaciente]`: `(id: string) => Promise<void>`
  - `[pacientes.ts:restaurarPaciente]`: `(id: string) => Promise<void>`
- **`pre-cadastros.ts`** (`"use server"`):
  - `[pre-cadastros.ts:PreCadastroActionState]`: `type { error?: string; success?: boolean }`
  - `[pre-cadastros.ts:solicitarUploadPreCadastro]`: `(input: { sessaoId: string; nome: string; mime: string; tamanho: number }) => Promise<{ error: string } | { chave: string; url: string }>`
  - `[pre-cadastros.ts:criarPreCadastro]`: `(_prevState: PreCadastroActionState, formData: FormData) => Promise<PreCadastroActionState>`
  - `[pre-cadastros.ts:listPreCadastros]`: `(filters: { status: StatusPreCadastro; q?: string }, page: number) => Promise<{ itens, total, totalPages, page }>`
  - `[pre-cadastros.ts:contarPreCadastrosPorStatus]`: `() => Promise<Record<StatusPreCadastro, number>>`
  - `[pre-cadastros.ts:buscarPreCadastroPendente]`: `(id: string) => Promise<PreCadastro | null>`
  - `[pre-cadastros.ts:rejeitarPreCadastro]`: `(id: string, _prevState: PreCadastroActionState, formData: FormData) => Promise<PreCadastroActionState>`
- **`assinatura-profissional.ts`** (`"use server"`): `salvarMinhaAssinatura(dataUrl)` and `removerMinhaAssinatura()` — always act on the session user (no id argument); save validates PNG, ≤ 300 KB and ≤ 900×300, creates an `AssinaturaProfissional` version and points `User.assinaturaAtualId` to it; remove only clears the pointer.
- **`documentos-paciente.ts`** (`"use server"`):
  - `[documentos-paciente.ts:DocumentoActionState]`: `type { error?: string; success?: boolean; id?: string }`
  - `[documentos-paciente.ts:listarDocumentosPaciente]`: `(pacienteId: string) => Promise<ReturnType<typeof listarDocumentosDoPaciente>>`
  - `[documentos-paciente.ts:criarDocumento]`: `(pacienteId: string, tipoSlug: string, _prev: DocumentoActionState, formData: FormData) => Promise<DocumentoActionState>`
  - `[documentos-paciente.ts:atualizarDocumento]`: `(id: string, _prev: DocumentoActionState, formData: FormData) => Promise<DocumentoActionState>`
  - `[documentos-paciente.ts:excluirDocumento]`: `(id: string) => Promise<void>`
- **`evolucoes.ts`** (`"use server"`):
  - `[evolucoes.ts:EvolucaoActionState]`: `type { error?: string; success?: boolean }`
  - `[evolucoes.ts:listEvolucoes]`: `(filters: { pacienteIds?: string[]; profissionalIds?: string[]; de?: string; ate?: string }, page: number) => Promise<{ evolucoes, total, totalPages, page }>`
  - `[evolucoes.ts:getEvolucoesByPaciente]`: `(pacienteId: string) => Promise<EvolucaoWithProfissional[]>`
  - `[evolucoes.ts:getEvolucao]`: `(id: string) => Promise<EvolucaoWithRelations | null>`
  - `[evolucoes.ts:createEvolucao]`: `(pacienteId: string, _prevState: EvolucaoActionState, formData: FormData) => Promise<EvolucaoActionState>`
  - `[evolucoes.ts:updateEvolucao]`: `(id: string, pacienteId: string, _prevState: EvolucaoActionState, formData: FormData) => Promise<EvolucaoActionState>`
  - `[evolucoes.ts:deleteEvolucao]`: `(id: string, pacienteId: string) => Promise<void>`
- **`paciente-anexos.ts`** (`"use server"`):
  - `[paciente-anexos.ts:AnexoPaciente]`: `type AnexoPaciente = AnexoPacienteItem`
  - `[paciente-anexos.ts:listarAnexosPaciente]`: `(pacienteId: string) => Promise<AnexoPaciente[]>`
  - `[paciente-anexos.ts:solicitarUploadAnexoPaciente]`: `(pacienteId: string, input: { nome: string; mime: string; tamanho: number }) => ReturnType<typeof criarTicketUpload>`
  - `[paciente-anexos.ts:confirmarAnexoPaciente]`: `(pacienteId: string, input: { chave: string; nomeOriginal: string }) => Promise<{ error: string } | { success: true }>`
  - `[paciente-anexos.ts:removerAnexoPaciente]`: `(anexoId: string) => Promise<{ error: string } | { success: true }>`

### Scheduling, Recurring Grids & Clinic Operations

- **`agendamentos.ts`** (`"use server"`):
  - `[agendamentos.ts:RemarcarActionState]`: `type { error?: string; success?: boolean; requiresConfirmacao?: boolean }`
  - `[agendamentos.ts:DesmarcarAgendamentoState]`: `type { error?: string; success?: boolean }`
  - `[agendamentos.ts:DiaDisponibilidade]`: `type { data: string; temHorarios: boolean; vagas: number; lotado: boolean }`
  - `[agendamentos.ts:AgendamentoAssistidoState]`: `type { error?: string; success?: boolean }`
  - `[agendamentos.ts:AgendamentoServicoState]`: `type { error?: string; success?: boolean }`
  - `[agendamentos.ts:listAgendamentos]`: `(filters: FiltrosAgendamentoComuns & { pacienteIds?: string[]; status?: string[]; de?: string; ate?: string }, page: number) => Promise<{ agendamentos, total, totalPages, page }>`
  - `[agendamentos.ts:listAgendamentosPorIntervalo]`: `(intervalo: { inicio: Date; fim: Date } & FiltrosAgendamentoComuns) => Promise<Agendamento[]>`
  - `[agendamentos.ts:getAgendamentosDoDia]`: `(data: string, profissionalId: string | null, excludeId?: string) => Promise<Array<{ id, titulo, dataInicio, dataFim }>>`
  - `[agendamentos.ts:getDisponibilidadeHorarios]`: `(data: string, modalidade: ModalidadeAgendamento, excludeId?: string, planoAtribuicaoId?: string) => Promise<Array<{ horario, duracaoMin, capacidade, ocupadas, vagas }>>`
  - `[agendamentos.ts:atualizarStatusAgendamento]`: `(id: string, status: "COMPARECEU" | "FALTOU" | "AGENDADO") => Promise<void>`
  - `[agendamentos.ts:remarcarAgendamento]`: `(id: string, novaData: string, novaHoraInicio: string, novaHoraFim: string, justificativa?: string, forcar?: boolean) => Promise<RemarcarActionState>`
  - `[agendamentos.ts:desmarcarAgendamentoPeloPaciente]`: `(agendamentoId: string, pacienteId: string, justificativa: string) => Promise<DesmarcarAgendamentoState>`
  - `[agendamentos.ts:getDadosAgendamentoAssistido]`: `(pacienteId: string) => Promise<{ opcoes, profissionais }>`
  - `[agendamentos.ts:getDisponibilidadeMes]`: `(params: { modalidade: ModalidadeAgendamento; ano: number; mes: number; excludeId?: string; planoAtribuicaoId?: string }) => Promise<{ dias: DiaDisponibilidade[] }>`
  - `[agendamentos.ts:getDisponibilidadeMesAssistido]`: `(params: { modalidade: ModalidadeAgendamento; ano: number; mes: number; planoAtribuicaoId: string; atendimentos: number | null; periodicidade?: string }) => Promise<{ dias, limiteMes, usadosNoMes, limiteTotal, usadosTotal, limiteMesAtingido, limiteTotalAtingido, limiteAtingido }>`
  - `[agendamentos.ts:criarAgendamentoAssistido]`: `(params: { pacienteId: string; planoAtribuicaoId: string; profissionalId: string; modalidade: ModalidadeAgendamento; data: string; horario: string }) => Promise<AgendamentoAssistidoState>`
  - `[agendamentos.ts:getConsumoPlanoPaciente]`: `(pacienteId: string, ano: number, mes: number) => Promise<Array<{ atribuicaoId, planoNome, tipos, atendimentos, periodicidade, total, usados, usadosTotal, disponiveisTotal, creditos, disponiveis, agendamentos }>>`
  - `[agendamentos.ts:criarAgendamentoServico]`: `(params: { pacienteId: string; servicoId: string; profissionalId: string; data: string; horaInicio: string; horaFim: string; valor: number; formaPagamento: "A_VISTA" | "ATE_3X_CARTAO"; vencimentos: string[] }) => Promise<AgendamentoServicoState>`
  - `[agendamentos.ts:listAgendamentosServicoPaciente]`: `(pacienteId: string, ano: number, mes: number) => Promise<Array<{ id, titulo, dataInicio, dataFim, status, servicoNome, profissional, sala }>>`
- **`grade-recorrente.ts`** (`"use server"`):
  - `[grade-recorrente.ts:SalvarGradeState]`: `type { error?: string; success?: boolean; resumo?: MaterializacaoResumo }`
  - `[grade-recorrente.ts:PreviewGradeState]`: `type { error?: string; totalPlano: number | null; usadosAtuais: number; previstos: number; totalFinal: number; completo: boolean; ultimaData: string | null }`
  - `[grade-recorrente.ts:MaterializacaoResumo]`: `type { criados: number; pulados: { data: string; motivo: string }[] }`
  - `[grade-recorrente.ts:ConflitosGradeState]`: `type { error?: string; conflitos: { data: string; motivo: string }[]; criadosSimulados: number }`
  - `[grade-recorrente.ts:getGradeRecorrenteOpcoes]`: `() => Promise<{ horariosPorModalidade, profissionais }>`
  - `[grade-recorrente.ts:getLinhasGradeRecorrente]`: `(atribuicaoId: string) => Promise<GradeRecorrenteLinha[]>`
  - `[grade-recorrente.ts:getGradeRecorrenteContexto]`: `(pacienteId: string) => Promise<{ opcoes, linhasPorAtribuicao }>`
  - `[grade-recorrente.ts:salvarGradeRecorrente]`: `(atribuicaoId: string, linhasRaw: GradeRecorrenteLinha[]) => Promise<SalvarGradeState>`
  - `[grade-recorrente.ts:previewGradeRecorrente]`: `(atribuicaoId: string, linhasRaw: GradeRecorrenteLinha[]) => Promise<PreviewGradeState>`
  - `[grade-recorrente.ts:validarLinhasGrade]`: `(linhasRaw: GradeRecorrenteLinha[], tiposPlano: string[], maxAtendimentos: number | null) => Promise<string | null>`
  - `[grade-recorrente.ts:aplicarGradeRecorrente]`: `(atribuicaoId: string, linhasRaw: GradeRecorrenteLinha[]) => Promise<MaterializacaoResumo>`
  - `[grade-recorrente.ts:materializarGradeRecorrente]`: `(atribuicaoId: string) => Promise<MaterializacaoResumo>`
  - `[grade-recorrente.ts:verificarConflitosGrade]`: `(atribuicaoId: string, linhasRaw: GradeRecorrenteLinha[]) => Promise<ConflitosGradeState>`
  - `[grade-recorrente.ts:materializarGradesPaciente]`: `(pacienteId: string) => Promise<void>`
  - `[grade-recorrente.ts:materializarTodasGrades]`: `() => Promise<void>`
- **`funcionamento.ts`** (`"use server"`):
  - `[funcionamento.ts:FuncionamentoActionState]`: `type { error?: string; success?: boolean }`
  - `[funcionamento.ts:listDiasFuncionamento]`: `() => Promise<Array<{ diaSemana: DiaSemana; label: string; aberto: boolean }>>`
  - `[funcionamento.ts:listFeriados]`: `() => Promise<Feriado[]>`
  - `[funcionamento.ts:setDiaFuncionamento]`: `(diaSemana: DiaSemana, aberto: boolean) => Promise<void>`
  - `[funcionamento.ts:createFeriado]`: `(_prev: FuncionamentoActionState, formData: FormData) => Promise<FuncionamentoActionState>`
  - `[funcionamento.ts:deleteFeriado]`: `(id: string) => Promise<void>`
- **`horarios-atendimento.ts`** (`"use server"`):
  - `[horarios-atendimento.ts:HorarioAtendimentoActionState]`: `type { error?: string; success?: boolean }`
  - `[horarios-atendimento.ts:listHorariosAtendimentoAgrupados]`: `() => Promise<Array<{ modalidade: ModalidadeComHorarioFixo; horarios: HorarioAtendimento[] }>>`
  - `[horarios-atendimento.ts:createHorarioAtendimento]`: `(_prevState: HorarioAtendimentoActionState, formData: FormData) => Promise<HorarioAtendimentoActionState>`
  - `[horarios-atendimento.ts:alternarAtivoHorarioAtendimento]`: `(id: string, ativo: boolean) => Promise<void>`
  - `[horarios-atendimento.ts:deleteHorarioAtendimento]`: `(id: string) => Promise<void>`
- **`salas.ts`** (`"use server"`):
  - `[salas.ts:SalaActionState]`: `type { error?: string; success?: boolean }`
  - `[salas.ts:listSalas]`: `() => Promise<Sala[]>`
  - `[salas.ts:createSala]`: `(_prev: SalaActionState, formData: FormData) => Promise<SalaActionState>`
  - `[salas.ts:updateSala]`: `(id: string, _prev: SalaActionState, formData: FormData) => Promise<SalaActionState>`
  - `[salas.ts:deleteSala]`: `(id: string) => Promise<void>`

### Plans, Services, Contracts, Billing, Expenses & Dashboard

- **`planos.ts`** (`"use server"`):
  - `[planos.ts:PlanoActionState]`: `type { error?: string; success?: boolean }`
  - `[planos.ts:listPlanos]`: `(filters: { q?: string; tipo?: "FISIOTERAPIA" | "EDUCACAO_FISICA" }, page: number) => Promise<{ planos, total, totalPages, page }>`
  - `[planos.ts:listPlanosDisponiveis]`: `() => Promise<Array<ReturnType<typeof planoValoresParaNumero>>>`
  - `[planos.ts:getPlano]`: `(id: string) => Promise<ReturnType<typeof planoValoresParaNumero> | null>`
  - `[planos.ts:createPlano]`: `(_prevState: PlanoActionState, formData: FormData) => Promise<PlanoActionState>`
  - `[planos.ts:updatePlano]`: `(id: string, _prevState: PlanoActionState, formData: FormData) => Promise<PlanoActionState>`
  - `[planos.ts:deletePlano]`: `(id: string) => Promise<void>`
- **`plano-atribuicoes.ts`** (`"use server"`):
  - `[plano-atribuicoes.ts:PlanoAtribuicaoActionState]`: `type { error?: string; success?: boolean }`
  - `[plano-atribuicoes.ts:RenovarPlanoState]`: `type { error?: string; success?: boolean }`
  - `[plano-atribuicoes.ts:listPlanoAtribuicoesByPaciente]`: `(pacienteId: string) => Promise<PlanoAtribuicaoWithCobrancasAndContratos[]>`
  - `[plano-atribuicoes.ts:getPlanoAtribuicao]`: `(id: string) => Promise<PlanoAtribuicaoWithCobrancas | null>`
  - `[plano-atribuicoes.ts:createPlanoAtribuicao]`: `(pacienteId: string, _prevState: PlanoAtribuicaoActionState, formData: FormData) => Promise<PlanoAtribuicaoActionState>`
  - `[plano-atribuicoes.ts:updatePlanoAtribuicao]`: `(id: string, pacienteId: string, _prevState: PlanoAtribuicaoActionState, formData: FormData) => Promise<PlanoAtribuicaoActionState>`
  - `[plano-atribuicoes.ts:cancelarPlanoAtribuicao]`: `(id: string, pacienteId: string) => Promise<void>`
  - `[plano-atribuicoes.ts:listPlanosRenovaveis]`: `() => Promise<Array<{ id, pacienteId, pacienteNome, planoNome, periodicidade, atendimentos, total, realizados, cobrancasPagas, dataInicio, temPlano, maxParcelas }>>`
  - `[plano-atribuicoes.ts:renovarPlanoAtribuicao]`: `(atribuicaoId: string, primeiraData: string, numeroParcelas: number) => Promise<RenovarPlanoState>`
- **`servicos.ts`** (`"use server"`):
  - `[servicos.ts:ServicoActionState]`: `type { error?: string; success?: boolean }`
  - `[servicos.ts:listServicos]`: `(filters: { q?: string }, page: number) => Promise<{ servicos, total, totalPages, page }>`
  - `[servicos.ts:listAllServicos]`: `() => Promise<Array<{ id: string; nome: string; valorPadrao: number; taxaProfissionalPercentual: number }>>`
  - `[servicos.ts:getProfissionaisServico]`: `(servicoId: string) => Promise<Array<{ id: string; name: string }>>`
  - `[servicos.ts:getServico]`: `(id: string) => Promise<Servico | null>`
  - `[servicos.ts:createServico]`: `(_prevState: ServicoActionState, formData: FormData) => Promise<ServicoActionState>`
  - `[servicos.ts:updateServico]`: `(id: string, _prevState: ServicoActionState, formData: FormData) => Promise<ServicoActionState>`
  - `[servicos.ts:deleteServico]`: `(id: string) => Promise<void>`
- **`contratos.ts`** (`"use server"`):
  - `[contratos.ts:ModeloContratoState]`: `type { error?: string; success?: boolean; versao?: number }`
  - `[contratos.ts:listContratos]`: `(filters: { q?: string; status?: StatusContrato[] }, page: number) => Promise<{ itens, total, totalPages }>`
  - `[contratos.ts:getModeloParaEdicao]`: `() => Promise<{ versao, conteudo, contratadaId, usuarios }>`
  - `[contratos.ts:salvarModeloContrato]`: `(_prev: ModeloContratoState, formData: FormData) => Promise<ModeloContratoState>`
  - `[contratos.ts:gerarContratoDoPlano]`: `(planoAtribuicaoId: string, pacienteId: string) => Promise<void>`
- **`cobrancas.ts`** (`"use server"`):
  - `[cobrancas.ts:CobrancaActionState]`: `type { error?: string; success?: boolean }`
  - `[cobrancas.ts:getCobrancasByPaciente]`: `(pacienteId: string) => Promise<Array<Cobranca & { valor: number; valorBase: number | null }>>`
  - `[cobrancas.ts:listCobrancasPendentes]`: `() => Promise<Array<Cobranca & { paciente, valor: number; valorBase: number | null }>>`
  - `[cobrancas.ts:getCobranca]`: `(id: string) => Promise<(Cobranca & { valor: number; valorBase: number | null }) | null>`
  - `[cobrancas.ts:createCobranca]`: `(pacienteId: string, _prevState: CobrancaActionState, formData: FormData) => Promise<CobrancaActionState>`
  - `[cobrancas.ts:updateCobranca]`: `(id: string, pacienteId: string, _prevState: CobrancaActionState, formData: FormData) => Promise<CobrancaActionState>`
  - `[cobrancas.ts:marcarCobrancaPaga]`: `(id: string, pacienteId: string) => Promise<void>`
  - `[cobrancas.ts:deleteCobranca]`: `(id: string, pacienteId: string) => Promise<void>`
- **`configuracao-financeira.ts`** (`"use server"`):
  - `[configuracao-financeira.ts:ConfiguracaoTaxaActionState]`: `type { error?: string; success?: boolean }`
  - `[configuracao-financeira.ts:listConfiguracoesTaxa]`: `() => Promise<Array<ConfiguracaoTaxa & { percentual: number }>>`
  - `[configuracao-financeira.ts:getTaxaParcelamentoCartao]`: `() => Promise<number>`
  - `[configuracao-financeira.ts:updateConfiguracaoTaxa]`: `(id: string, _prevState: ConfiguracaoTaxaActionState, formData: FormData) => Promise<ConfiguracaoTaxaActionState>`
- **`despesas.ts`** (`"use server"`):
  - `[despesas.ts:DespesaActionState]`: `type { error?: string; success?: boolean; mes?: string }`
  - `[despesas.ts:listDespesas]`: `(filters: FiltrosDespesas, page?: number) => Promise<{ despesas, total, totalPaginas }>`
  - `[despesas.ts:getResumoDespesas]`: `(mes: string) => Promise<{ resumo, atrasadasOutrosMeses }>`
  - `[despesas.ts:getDespesa]`: `(id: string) => Promise<DespesaWithNumberValor | null>`
  - `[despesas.ts:createDespesa]`: `(_prevState: DespesaActionState, formData: FormData) => Promise<DespesaActionState>`
  - `[despesas.ts:updateDespesa]`: `(id: string, _prevState: DespesaActionState, formData: FormData) => Promise<DespesaActionState>`
  - `[despesas.ts:marcarDespesaPaga]`: `(id: string) => Promise<void>`
  - `[despesas.ts:deleteDespesa]`: `(id: string) => Promise<void>`
- **`dashboard.ts`** (`"use server"`):
  - `[dashboard.ts:PeriodoProximos]`: `type "dia" | "semana" | "mes"`
  - `[dashboard.ts:CobrancaAtrasada]`: `type { id: string; pacienteId: string; pacienteNome: string; planoNome: string; vencimento: Date; valor: number }`
  - `[dashboard.ts:getContagensAgenda]`: `(filters?: FiltrosAgendamentoComuns) => Promise<{ dia: number; semana: number; mes: number }>`
  - `[dashboard.ts:getDashboardStats]`: `() => Promise<{ pacientes: number; avaliacoes: number; evolucoes: number }>`
  - `[dashboard.ts:getProximosAgendamentos]`: `(periodo?: PeriodoProximos, filters?: FiltrosAgendamentoComuns) => Promise<AgendamentoWithRelations[]>`
  - `[dashboard.ts:getAnaliseFinanceira]`: `() => Promise<ReturnType<typeof analisarFinanceiro> & { atrasadas: CobrancaAtrasada[]; comparativo: ReturnType<typeof compararReceitaDespesa> }>`

### Exams, Executions & Clinical Images

- **`exames.ts`** (`"use server"`):
  - `[exames.ts:ExameActionState]`: `type { error?: string; errorPath?: (string | number)[]; success?: boolean }`
  - `[exames.ts:SincronizacaoExame]`: `type { id: string; carregadoEm: string; draft: ExameDraft; mapaIds: Record<string, string>; editores: string[]; ultimaAlteracao: { por: string | null; em: string } | null }`
  - `[exames.ts:AutosalvarExameResultado]`: `type { ok: true; sincronizacao: SincronizacaoExame } | { ok: false; conflito: true } | { ok: false; conflito?: false; error: string; errorPath?: (string | number)[] }`
  - `[exames.ts:listExames]`: `(filters: { q?: string; tipo?: "FISIOTERAPIA" | "EDUCACAO_FISICA" }, page: number) => Promise<{ exames, total, totalPages, page }>`
  - `[exames.ts:getExame]`: `(id: string) => Promise<ExameWithSecoesCamposColunas | null>`
  - `[exames.ts:createExame]`: `(_prevState: ExameActionState, formData: FormData) => Promise<ExameActionState>`
  - `[exames.ts:sincronizarExame]`: `(id: string) => Promise<SincronizacaoExame | null>`
  - `[exames.ts:sairDaEdicaoExame]`: `(id: string) => Promise<void>`
  - `[exames.ts:autosalvarExame]`: `(id: string, dados: ExameDraft, carregadoEm: string) => Promise<AutosalvarExameResultado>`
  - `[exames.ts:deleteExame]`: `(id: string) => Promise<void>`
- **`exame-execucoes.ts`** (`"use server"`):
  - `[exame-execucoes.ts:ExameExecucaoActionState]`: `type { error?: string; success?: boolean; execucaoId?: string; imagensFalhas?: number }`
  - `[exame-execucoes.ts:listAllExamesCompletos]`: `() => Promise<ExameWithSecoesCamposColunas[]>`
  - `[exame-execucoes.ts:getAvaliacoesByPaciente]`: `(pacienteId: string) => Promise<ExameExecucaoAvaliacaoSummary[]>`
  - `[exame-execucoes.ts:getExecucao]`: `(id: string) => Promise<ExameExecucaoDetail | null>`
  - `[exame-execucoes.ts:getExecucaoAnteriorParaRetorno]`: `(pacienteId: string, exameId: string) => Promise<ExameExecucaoWithValores | null>`
  - `[exame-execucoes.ts:getComparativo]`: `(avaliacaoId: string, retornoId: string) => Promise<{ paciente, exame, avaliacaoData, retornoData, secoes } | null>`
  - `[exame-execucoes.ts:getComparacaoRapida]`: `(avaliacaoId: string, execucaoIds: string[]) => Promise<{ paciente, exame, execucoes, secoes } | null>`
  - `[exame-execucoes.ts:createAvaliacao]`: `(pacienteId: string, _prevState: ExameExecucaoActionState, formData: FormData) => Promise<ExameExecucaoActionState>`
  - `[exame-execucoes.ts:createRetorno]`: `(pacienteId: string, avaliacaoId: string, _prevState: ExameExecucaoActionState, formData: FormData) => Promise<ExameExecucaoActionState>`
  - `[exame-execucoes.ts:updateExecucao]`: `(execucaoId: string, pacienteId: string, _prevState: ExameExecucaoActionState, formData: FormData) => Promise<ExameExecucaoActionState>`
  - `[exame-execucoes.ts:deleteExecucao]`: `(id: string, pacienteId: string) => Promise<void>`
- **`exame-imagens.ts`** (`"use server"`):
  - `[exame-imagens.ts:ImagemExame]`: `type { id: string; colunaId: string; linha: number; nomeOriginal: string; mime: string; url: string }`
  - `[exame-imagens.ts:ImagemSerie]`: `type { id: string; url: string; nomeOriginal: string; rotulo: string; tipo: "AVALIACAO" | "RETORNO"; data: Date; anotacoes: Anotacoes | null }`
  - `[exame-imagens.ts:SerieImagens]`: `type { id: string; exameNome: string; avaliacaoData: Date; imagens: ImagemSerie[] }`
  - `[exame-imagens.ts:listarImagensExecucao]`: `(execucaoId: string) => Promise<ImagemExame[]>`
  - `[exame-imagens.ts:solicitarUploadImagem]`: `(input: { pacienteId: string; nome: string; mime: string; tamanho: number }) => Promise<{ error: string } | { chave: string; url: string }>`
  - `[exame-imagens.ts:descartarUploadTemporario]`: `(input: { pacienteId: string; chave: string }) => Promise<void>`
  - `[exame-imagens.ts:listarSeriesImagensPaciente]`: `(pacienteId: string) => Promise<SerieImagens[]>`
  - `[exame-imagens.ts:salvarAnotacoesImagem]`: `(imagemId: string, anotacoes: Anotacoes | null) => Promise<{ error: string } | { ok: true }>`

### Libraries & Workouts

- **`categorias.ts`** (`"use server"`):
  - `[categorias.ts:CategoriaActionState]`: `type { error?: string; success?: boolean }`
  - `[categorias.ts:listCategorias]`: `(filters: { q?: string }, page: number) => Promise<{ categorias, total, totalPages, page }>`
  - `[categorias.ts:listAllCategorias]`: `() => Promise<Array<{ id: string; name: string }>>`
  - `[categorias.ts:createCategoria]`: `(_prevState: CategoriaActionState, formData: FormData) => Promise<CategoriaActionState>`
  - `[categorias.ts:updateCategoria]`: `(id: string, _prevState: CategoriaActionState, formData: FormData) => Promise<CategoriaActionState>`
  - `[categorias.ts:deleteCategoria]`: `(id: string) => Promise<void>`
- **`exercicios.ts`** (`"use server"`):
  - `[exercicios.ts:ExercicioActionState]`: `type { error?: string; success?: boolean }`
  - `[exercicios.ts:listExercicios]`: `(filters: { q?: string; categoriaIds?: string[] }, page: number) => Promise<{ exercicios, total, totalPages, page }>`
  - `[exercicios.ts:createExercicio]`: `(_prevState: ExercicioActionState, formData: FormData) => Promise<ExercicioActionState>`
  - `[exercicios.ts:updateExercicio]`: `(id: string, _prevState: ExercicioActionState, formData: FormData) => Promise<ExercicioActionState>`
  - `[exercicios.ts:deleteExercicio]`: `(id: string) => Promise<void>`
- **`movimentos.ts`** (`"use server"`):
  - `[movimentos.ts:MovimentoActionState]`: `type { error?: string; success?: boolean }`
  - `[movimentos.ts:ImportMovimentosState]`: `type { error?: string; success?: boolean; imported?: number }`
  - `[movimentos.ts:listMovimentos]`: `(filters: { q?: string }, page: number) => Promise<{ movimentos, total, totalPages, page }>`
  - `[movimentos.ts:listAllMovimentos]`: `() => Promise<Array<{ id: string; nome: string; grauIdeal: string }>>`
  - `[movimentos.ts:createMovimento]`: `(_prevState: MovimentoActionState, formData: FormData) => Promise<MovimentoActionState>`
  - `[movimentos.ts:updateMovimento]`: `(id: string, _prevState: MovimentoActionState, formData: FormData) => Promise<MovimentoActionState>`
  - `[movimentos.ts:deleteMovimento]`: `(id: string) => Promise<void>`
  - `[movimentos.ts:importMovimentosCsv]`: `(_prevState: ImportMovimentosState, formData: FormData) => Promise<ImportMovimentosState>`
- **`treinos.ts`** (`"use server"`):
  - `[treinos.ts:TreinoActionState]`: `type { error?: string; success?: boolean }`
  - `[treinos.ts:AtribuirTreinoActionState]`: `type { error?: string; success?: boolean }`
  - `[treinos.ts:listTreinos]`: `(filters: { q?: string }, page: number) => Promise<{ treinos, total, totalPages, page }>`
  - `[treinos.ts:listAllTreinos]`: `() => Promise<Array<{ id: string; nome: string }>>`
  - `[treinos.ts:getTreino]`: `(id: string) => Promise<Treino | null>`
  - `[treinos.ts:createTreino]`: `(_prevState: TreinoActionState, formData: FormData) => Promise<TreinoActionState>`
  - `[treinos.ts:updateTreino]`: `(id: string, _prevState: TreinoActionState, formData: FormData) => Promise<TreinoActionState>`
  - `[treinos.ts:deleteTreino]`: `(id: string) => Promise<void>`
  - `[treinos.ts:assignTreino]`: `(_prevState: AtribuirTreinoActionState, formData: FormData) => Promise<AtribuirTreinoActionState>`
- **`treinos-paciente.ts`** (`"use server"`):
  - `[treinos-paciente.ts:TreinoPacienteActionState]`: `type { error?: string; success?: boolean }`
  - `[treinos-paciente.ts:listTreinosPaciente]`: `(pacienteId: string) => Promise<Treino[]>`
  - `[treinos-paciente.ts:getTreinoPaciente]`: `(id: string, pacienteId: string) => Promise<Treino | null>`
  - `[treinos-paciente.ts:updateTreinoPaciente]`: `(id: string, pacienteId: string, _prevState: TreinoPacienteActionState, formData: FormData) => Promise<TreinoPacienteActionState>`
  - `[treinos-paciente.ts:desativarTreinoPaciente]`: `(id: string, pacienteId: string) => Promise<void>`
  - `[treinos-paciente.ts:deleteTreinoPaciente]`: `(id: string, pacienteId: string) => Promise<void>`

### Public Patient Portal Wrappers

- **`portal-agendamentos.ts`** (`"use server"`):
  - `[portal-agendamentos.ts:portalGetConsumoPlanoPaciente]`: `(token: string, _pacienteId: string, ano: number, mes: number) => ReturnType<typeof getConsumoPlanoPaciente>`
  - `[portal-agendamentos.ts:portalDesmarcarAgendamento]`: `(token: string, agendamentoId: string, _pacienteId: string, justificativa: string) => Promise<{ error: string } | DesmarcarAgendamentoState>`
  - `[portal-agendamentos.ts:portalGetDadosAgendamentoAssistido]`: `(token: string, _pacienteId: string) => ReturnType<typeof getDadosAgendamentoAssistido>`
  - `[portal-agendamentos.ts:portalGetDisponibilidadeMesAssistido]`: `(token: string, params: Parameters<typeof getDisponibilidadeMesAssistido>[0]) => ReturnType<typeof getDisponibilidadeMesAssistido>`
  - `[portal-agendamentos.ts:portalGetDisponibilidadeHorarios]`: `(token: string, data: string, modalidade: Parameters<typeof getDisponibilidadeHorarios>[1], excludeId?: string, planoAtribuicaoId?: string) => ReturnType<typeof getDisponibilidadeHorarios>`
  - `[portal-agendamentos.ts:portalCriarAgendamentoAssistido]`: `(token: string, params: Parameters<typeof criarAgendamentoAssistido>[0]) => Promise<{ error: string } | AgendamentoAssistidoState>`
- **`portal-anexos.ts`** (`"use server"`):
  - `[portal-anexos.ts:solicitarUploadAnexoPortal]`: `(token: string, input: { nome: string; mime: string; tamanho: number }) => Promise<{ error: string } | ReturnType<typeof criarTicketUpload>>`
  - `[portal-anexos.ts:confirmarAnexoPortal]`: `(token: string, input: { chave: string; nomeOriginal: string }) => Promise<{ error: string } | { success: true }>`
  - `[portal-anexos.ts:removerAnexoPortal]`: `(token: string, anexoId: string) => Promise<{ error: string } | { success: true }>`
- **`portal-contratos.ts`** (`"use server"`):
  - `[portal-contratos.ts:ContratoLiberado]`: `type { status: "PENDENTE"; conteudo: string; conteudoHash: string } | { status: "ASSINADO"; conteudo: string; assinadoEm: string; pdfUrl: string }`
  - `[portal-contratos.ts:liberarContrato]`: `(token: string, cpf: string) => Promise<{ ok: true; dados: ContratoLiberado } | { ok: false; error: string }>`
  - `[portal-contratos.ts:assinarContrato]`: `(token: string, entrada: { cpf: string; conteudoHash: string; assinatura: string; aceite: boolean }) => Promise<{ ok: true; dados: { assinadoEm: string; pdfUrl: string } } | { ok: false; error: string }>`

## Invariants

### Authentication, Authorization & Portal Isolation

- **Clinic staff session gate (`exigirSessao`)**: All actions in `acessos-compartilhados.ts`, `categorias.ts`, `configuracao-financeira.ts`, `contratos.ts`, `dashboard.ts`, `despesas.ts`, `documentos-paciente.ts`, `exame-imagens.ts`, `exames.ts`, `exercicios.ts`, `funcionamento.ts`, `horarios-atendimento.ts`, `logs.ts`, `movimentos.ts`, `paciente-anexos.ts`, `pacientes.ts`, `planos.ts`, `salas.ts`, `servicos.ts`, `treinos-paciente.ts`, `treinos.ts`, `usuarios.ts`, plus the staff-only actions of `agendamentos.ts`, `cobrancas.ts`, `evolucoes.ts`, `exame-execucoes.ts`, `grade-recorrente.ts`, `plano-atribuicoes.ts`, and `pre-cadastros.ts` (`listPreCadastros`, `contarPreCadastrosPorStatus`, `buscarPreCadastroPendente`, `rejeitarPreCadastro`), call `await exigirSessao()`. None of these modules perform role/admin checks—including `[usuarios.ts:createUsuario,updateUsuario,deleteUsuario]`, which enforce `exigirSessao()` without an admin-role or self-deletion guard.
- **Dual staff/portal gate (`exigirSessaoOuPortal`)**:
  - Patient-scoped (`exigirSessaoOuPortal(pacienteId)`): `[agendamentos.ts:desmarcarAgendamentoPeloPaciente,getDadosAgendamentoAssistido,criarAgendamentoAssistido,getConsumoPlanoPaciente]`, `[cobrancas.ts:getCobrancasByPaciente]`, `[evolucoes.ts:getEvolucoesByPaciente]`, `[exame-execucoes.ts:getAvaliacoesByPaciente]`, `[grade-recorrente.ts:materializarGradesPaciente]`, and `[plano-atribuicoes.ts:listPlanoAtribuicoesByPaciente]`. Note that `[grade-recorrente.ts:materializarGradesPaciente]` calls `exigirSessaoOuPortal(pacienteId)` and then delegates to `[grade-recorrente.ts:materializarGradeRecorrente]`, which itself calls `await exigirSessao()`.
  - Unscoped (`exigirSessaoOuPortal()`): `[agendamentos.ts:getDisponibilidadeHorarios,getDisponibilidadeMesAssistido]` and `[exame-execucoes.ts:getExecucao]` (when invoked from the portal, `[exame-execucoes.ts:getExecucao]` checks `pacienteDoPortal()` and restricts the Prisma lookup to `{ id, pacienteId: doPortal }`).
- **Public / token-gated entry points (no staff session)**:
  - `[auth.ts:loginAction]`: validates credentials via `loginSchema.safeParse`; distinguishes NextAuth `CredentialsSignin` lockouts (`code.startsWith("bloqueado:")`) from generic invalid-credentials errors and rethrows non-`AuthError` exceptions so Next.js redirects propagate.
  - `[pre-cadastros.ts:solicitarUploadPreCadastro,criarPreCadastro]`: public patient self-registration and R2 upload ticketing gated by `solicitarUploadPreCadastroSchema`, `preCadastroSchema`, `sessaoUploadValida`, and `validarArquivo`.
  - `[portal-agendamentos.ts:pacienteDoToken]`: all 6 portal scheduling wrappers derive `pacienteId` strictly server-side from `buscarPacienteIdPorToken(token)` (ignoring client-supplied `_pacienteId` and `params.pacienteId`) and run inside `comAcessoPortal(pacienteId, ...)`. Query wrappers throw `LinkInvalidoError("Link inválido ou expirado.")` on invalid token; mutation wrappers (`portalDesmarcarAgendamento`, `portalCriarAgendamentoAssistido`) return `{ error }`. `[portal-agendamentos.ts:exigirPlanoDoPaciente]` verifies any `planoAtribuicaoId` belongs to the token's patient; `[portal-agendamentos.ts:portalGetDisponibilidadeHorarios]` forces `excludeId = undefined`.
  - `[portal-anexos.ts:solicitarUploadAnexoPortal,confirmarAnexoPortal,removerAnexoPortal]`: derive `pacienteId` via `buscarPacienteIdPorToken(token)`, hardcode `origem: "PACIENTE"` on registration, and restrict removal to `{ id: anexoId, pacienteId, origem: "PACIENTE" }`.
  - `[portal-contratos.ts:conferirCpf,liberarContrato,assinarContrato]`: require token lookup via `buscarContratoComDados({ token })`, active (non-soft-deleted) patient (`!contrato.paciente.excluidoEm`), CPF lockout gate (`cpfBloqueado(contrato.bloqueadoAte)`), and `cpfConfere(cpf, contrato.paciente.cpf)`. Failed CPF checks update lockout state via `estadoAposFalhaCpf`; matching CPF resets `tentativasCpf` to `0`.

### Validation, Uniqueness, Ownership & Soft-Delete Invariants

- **Action state return convention**: Form/mutation actions validate inputs with Zod (`*.safeParse`) or domain validators and return `{ error: string }` on validation/business errors and `{ success: true }` on success (with action-specific extensions: `[agendamentos.ts:remarcarAgendamento]` `{ requiresConfirmacao: true }`, `[contratos.ts:salvarModeloContrato]` `{ versao }`, `[despesas.ts:createDespesa,updateDespesa]` `{ mes }`, `[documentos-paciente.ts:criarDocumento]` `{ id }`, `[exames.ts:createExame]` `{ errorPath }`, `[exame-execucoes.ts:createAvaliacao,createRetorno,updateExecucao]` `{ execucaoId, imagensFalhas }`, `[grade-recorrente.ts:salvarGradeRecorrente]` `{ resumo }`, `[movimentos.ts:importMovimentosCsv]` `{ imported }`, `[exames.ts:autosalvarExame]` `{ ok, conflito?, sincronizacao? }`, `[portal-contratos.ts:liberarContrato,assinarContrato]` `{ ok, dados | error }`).
- **Zod schemas & domain validators**:
  - `[auth.ts:loginAction]` (`loginSchema`), `[categorias.ts:createCategoria,updateCategoria]` (`categoriaSchema`), `[cobrancas.ts:createCobranca,updateCobranca]` (`cobrancaSchema`), `[configuracao-financeira.ts:updateConfiguracaoTaxa]` (`configuracaoTaxaSchema`), `[despesas.ts:createDespesa,updateDespesa]` (`despesaSchema`), `[evolucoes.ts:createEvolucao,updateEvolucao]` (`evolucaoSchema`), `[exames.ts:parseExameForm,autosalvarExame]` (`exameSchema`), `[exame-execucoes.ts:parseExecucaoForm]` (`exameExecucaoSchema`), `[exame-imagens.ts:salvarAnotacoesImagem]` (`anotacoesSchema`), `[exercicios.ts:parseExercicioForm]` (`exercicioSchema`), `[funcionamento.ts:createFeriado]` (`feriadoSchema`), `[grade-recorrente.ts:validarLinhasGrade,aplicarGradeRecorrente]` (`gradeRecorrenteSchema`), `[horarios-atendimento.ts:createHorarioAtendimento]` (`horarioAtendimentoSchema`), `[movimentos.ts:createMovimento,updateMovimento]` (`movimentoSchema`), `[pacientes.ts:parsePacienteForm]` (`pacienteSchema`), `[plano-atribuicoes.ts:parseForm,renovarPlanoAtribuicao]` (`planoAtribuicaoSchema`, `renovarPlanoSchema`), `[planos.ts:parseForm]` (`planoSchema`), `[pre-cadastros.ts:solicitarUploadPreCadastro,criarPreCadastro,rejeitarPreCadastro]` (`solicitarUploadPreCadastroSchema`, `preCadastroSchema`, `rejeitarPreCadastroSchema`), `[salas.ts:parse]` (`salaSchema`), `[servicos.ts:parseForm]` (`servicoSchema`), `[treinos.ts:parseTreinoForm,assignTreino]` (`treinoSchema`, `atribuirTreinoSchema`), `[treinos-paciente.ts:parseTreinoForm]` (`treinoSchema`), `[usuarios.ts:createUsuario,updateUsuario]` (`usuarioSchema`, `usuarioUpdateSchema`), `[agendamentos.ts:criarAgendamentoServico]` (`agendamentoServicoPagamentoSchema`).
  - `[documentos-paciente.ts:criarDocumento,atualizarDocumento]` validate `tipoSlug` via `tipoDocumento`, active patient via `exigirPacienteAtivo` (`PACIENTE_ATIVO`), and values via `validarValoresDocumento`.
  - `[contratos.ts:salvarModeloContrato]` normalizes line breaks (`normalizarQuebras`), rejects `conteudo.length < 50`, rejects unknown placeholders (`variaveisDesconhecidas`), requires `contratadaId` referencing a `User` with non-blank `cpfCnpj`, skips creating a new version if identical to latest, and monotonically increments `versao`.
- **Uniqueness & referential delete guards**:
  - Unique checks: `[categorias.ts:createCategoria,updateCategoria]` (`categoria.name`), `[funcionamento.ts:createFeriado]` (`feriado.data` normalized to UTC midnight `${data}T00:00:00.000Z`), `[horarios-atendimento.ts:createHorarioAtendimento]` (composite `(modalidade, horario)` + sequential `ordem`), `[movimentos.ts:createMovimento,updateMovimento]` (`movimento.nome`), `[planos.ts:createPlano,updatePlano]` (`plano.nome`), `[salas.ts:createSala,updateSala]` (`sala.nome` + sequential `ordem`), `[servicos.ts:createServico,updateServico]` (`servico.nome`), `[usuarios.ts:createUsuario,updateUsuario]` (`user.email`; hashes password via `bcrypt.hash(password, 10)` on create and only when truthy on update).
  - Delete protection (throws `Error` when in use): `[categorias.ts:deleteCategoria]` (`_count.exercicios > 0`), `[exames.ts:deleteExame]` (`_count.execucoes > 0`), `[planos.ts:deletePlano]` (`_count.atribuicoes > 0`), `[salas.ts:deleteSala]` (referenced in `planoSala` or `salaServico`), `[servicos.ts:deleteServico]` (`_count.agendamentos > 0`).
- **Ownership checks & notable gaps**:
  - Verified ownership: `[agendamentos.ts:desmarcarAgendamentoPeloPaciente]` (`ag.pacientes.some`), `[agendamentos.ts:criarAgendamentoAssistido]` (`planoAtribuicao.pacienteId`), `[cobrancas.ts:updateCobranca]` (`existing.pacienteId === pacienteId`), `[evolucoes.ts:updateEvolucao]` (`existing.pacienteId === pacienteId`), `[exame-execucoes.ts:createRetorno,updateExecucao]` (`pacienteId === pacienteId`), `[plano-atribuicoes.ts:updatePlanoAtribuicao]` (`existing.pacienteId === pacienteId`), `[treinos-paciente.ts:getTreinoPaciente,updateTreinoPaciente,desativarTreinoPaciente,deleteTreinoPaciente]` (`treino.pacienteId === pacienteId`).
  - ID-only mutations (no `pacienteId` filter in query): `[cobrancas.ts:marcarCobrancaPaga,deleteCobranca]` (`pacienteId` only used for `revalidatePath`), `[treinos.ts:getTreino,updateTreino,deleteTreino]` (do not filter `pacienteId: null`, unlike `listTreinos`/`listAllTreinos`/`assignTreino`).
- **Soft-delete & pre-registration invariants**:
  - `[pacientes.ts:erroCpfDeExcluido]` blocks creating or updating a patient with a CPF belonging to a soft-deleted patient (`excluidoEm: { not: null }`).
  - `[pacientes.ts:createPaciente]` with `preCadastroId` requires `status === "PENDENTE"` and atomically creates the patient and marks the `PreCadastro` `"APROVADO"` in `prisma.$transaction`.
  - `[pacientes.ts:deletePaciente]` performs an idempotent soft-delete inside `prisma.$transaction` (`where: { id, excluidoEm: null }`, early-exiting if `count === 0`), cancelling or disconnecting future `AGENDADO` appointments (`planejarAgendamentosDaExclusao`), deactivating `gradeRecorrenteAtendimento` and `acessoCompartilhadoPaciente`, and cancelling only `PENDENTE` contracts. `[pacientes.ts:restaurarPaciente]` only clears `excluidoEm` when currently non-null.
  - `[pre-cadastros.ts:rejeitarPreCadastro]` enforces a single-transition atomic guard via `prisma.preCadastro.updateMany({ where: { id, status: "PENDENTE" } })`.
  - `[dashboard.ts:getDashboardStats,getAnaliseFinanceira]`, `[cobrancas.ts:listCobrancasPendentes]`, `[evolucoes.ts:listEvolucoes]`, `[pacientes.ts:listAllPacientes]`, and `[plano-atribuicoes.ts:listPlanosRenovaveis]` restrict active queries via `PACIENTE_ATIVO`; `[dashboard.ts:getAnaliseFinanceira]` intentionally retains paid (`status: "PAGO"`) charges of soft-deleted patients in historical revenue while excluding their `PENDENTE` charges.

### Scheduling, Recurring Materialization & Financial Invariants

- **Appointment availability, conflicts & rescheduling credits**:
  - `[agendamentos.ts:getAgendamentosDoDia,getDisponibilidadeHorarios,calcularDiasDisponiveis,contarAgendamentosNoMes,contarAgendamentosDaAtribuicao,getConsumoPlanoPaciente]` and `[dashboard.ts:getProximosAgendamentos]` exclude `status: "CANCELADO"` from occupancy, conflict, and plan usage calculations.
  - `[agendamentos.ts:getDisponibilidadeHorarios,calcularDiasDisponiveis]` respect clinic operating days and holidays from `getConfigFuncionamento()` (`[funcionamento.ts:listDiasFuncionamento]` defaults missing weekdays to `aberto: true`).
  - `[agendamentos.ts:remarcarAgendamento]` enforces `dataFim > dataInicio`, `validarFuncionamento`, `buscarConflito` (excluding self), room/capacity (`resolverSalaPlano` or `verificarCapacidade`), and—when linked to a `planoAtribuicao`—`justificativa.trim().length >= 3` plus monthly rescheduling credit checks (`contarCreditosRemarcacaoNoMes`, `semCreditos`), returning `{ requiresConfirmacao: true }` when credits are exhausted unless `forcar === true`. Executes update + conditional `creditoRemarcacao` (`origem: "CLINICA"`) in `prisma.$transaction`.
  - `[agendamentos.ts:desmarcarAgendamentoPeloPaciente]` requires `justificativa.trim().length >= 3`, `status === "AGENDADO"`, cancellation window `pacientePodeDesmarcar(ag.dataInicio)`, and available monthly rescheduling credits (no override); executes cancellation + conditional `creditoRemarcacao` (`origem: "PACIENTE"`) in `prisma.$transaction`.
  - `[agendamentos.ts:criarAgendamentoAssistido]` enforces `validarProfissionalModalidade`, active `planoAtribuicao` (`status: "ATIVO"`), active `horarioAtendimento`, `validarFuncionamento`, hard total and monthly plan limits (`totalAtendimentosPlano`, `atribuicao.atendimentos`), `buscarConflito`, and `resolverSalaPlano(quantidadePacientes: 1)`.
  - `[agendamentos.ts:criarAgendamentoServico]` requires active `servico`, `validarProfissionalServico`, `dataFim > dataInicio`, `validarFuncionamento`, `buscarConflito`, `resolverSalaServico`, and atomically creates the `OUTRO`/`AGENDADO` appointment and `PENDENTE` (`notaFiscal: true`) installments (`gerarValoresParcelas`, `calcularTaxaProfissional`) in `prisma.$transaction`.
- **Recurring schedule grid (`grade-recorrente.ts`)**:
  - `[grade-recorrente.ts:salvarGradeRecorrente,previewGradeRecorrente,verificarConflitosGrade]` require an active `planoAtribuicao` (`status === "ATIVO"`); `[grade-recorrente.ts:materializarGradeRecorrente]` no-ops cleanly if inactive or missing.
  - `[grade-recorrente.ts:validarLinhasGrade]` enforces `linhas.length <= maxAtendimentos`, plan modality coverage (`MODALIDADE_POR_TIPO_PLANO`), active `horarioAtendimento` when `temHorarioFixo(modalidade)`, and `validarProfissionalModalidade`.
  - `[grade-recorrente.ts:aplicarGradeRecorrente]` reconciles lines atomically in `prisma.$transaction`, deleting only future (`dataInicio > agora`) `AGENDADO` appointments with `gradeRecorrenteId !== null` (preserving past, completed, canceled, and manual appointments), then diffs `gradeRecorrenteAtendimento` by composite key `modalidade|diaSemana|horario|profissionalId`.
  - `[grade-recorrente.ts:processarGrade]` enforces plan total budget (`orcamentoGrade`), per-month Brasília calendar caps (overflowing full months silently), skip of past slots, `validarFuncionamento`, idempotency by `(gradeRecorrenteId, slotData)` when `!dryRun`, `buscarConflito`, and `resolverSalaPlano`.
- **Plan attributions, billing & contract signing**:
  - `[plano-atribuicoes.ts:createPlanoAtribuicao,updatePlanoAtribuicao,renovarPlanoAtribuicao]` force `notaFiscal = true`, enforce `maxParcelasPlano`, apply card installment fees (`cartaoDaForma(formaEfetiva(...))`), and execute attribution + `cobranca` writes atomically in `prisma.$transaction`. `updatePlanoAtribuicao` and `cancelarPlanoAtribuicao` delete only `PENDENTE` charges (preserving `PAGO` history); `cancelarPlanoAtribuicao` cancels only `PENDENTE` contracts and future `AGENDADO` grade appointments; `renovarPlanoAtribuicao` requires `planoRenovavel(...) === true`, carries over prior discount as `"VALOR"`, marks the old attribution `"CONCLUIDO"`, and deactivates its grade.
  - `[cobrancas.ts:createCobranca,updateCobranca]` compute `valor` via `aplicarTaxaNotaFiscal(valorBase, notaFiscal)` and synchronize `pagoEm` with `status === "PAGO"`.
  - `[configuracao-financeira.ts:getTaxaParcelamentoCartao]` falls back to `TAXA_PARCELAMENTO_CARTAO_PADRAO` when `CHAVE_TAXA_PARCELAMENTO_CARTAO` is absent.
  - `[portal-contratos.ts:assinarContrato]` requires `aceite === true`, valid PNG signature (`decodificarAssinaturaPng`), `status === "PENDENTE"`, zero `atual.pendencias.bloqueios`, matching `conteudoHash`, and enforces single-sign atomicity via `prisma.contrato.updateMany({ where: { id, status: "PENDENTE" } })`.

### Exam Versioning, Concurrency, Media & Pagination Invariants

- **Exam template versioning & presence (`exames.ts`)**:
  - `[exames.ts:listExames]` and `[exame-execucoes.ts:listAllExamesCompletos]` return only current versions (`versaoAtual: true`).
  - `[exames.ts:colunaData]` enforces column-type-specific field persistence; `[exames.ts:precisaColunaMembro]` prepends a `"Membro"` (`MEMBRO`) column whenever `repetivel && identificarMembro && !temGoniometria(campo)`.
  - `[exames.ts:autosalvarExame]` enforces optimistic concurrency via `parseCarregadoEm`/`exameAlteradoDesde` and `updatedAt: carregadoEm` (returning `{ ok: false, conflito: true }` on mismatch). If `prisma.exameExecucao.count({ where: { exameId: id } }) > 0`, it archives the existing version (`versaoAtual: false`) and creates a new version (`versaoAtual: true`, `exameOrigemId: id`) atomically in `prisma.$transaction` (`criarNovaVersaoExame`); otherwise it updates in place preserving IDs (`updateExameInPlace`).
  - `[exames.ts:resolverVersaoAtual]` walks up to 50 `exameOrigemId` hops composing ID maps; `[exames.ts:registrarPresenca]` treats editor heartbeats within `PRESENCA_VALIDADE_MS = 30_000` ms as active and prunes entries older than 24 hours.
- **Exam executions & R2 media guards (`exame-execucoes.ts`, `exame-imagens.ts`, `pre-cadastros.ts`)**:
  - `[exame-execucoes.ts:getComparativo,getComparacaoRapida]` require parent `tipo === "AVALIACAO"` and verified child `retorno.avaliacaoId === avaliacaoId`, dynamically recomputing `CALCULADO` fields (`acrescentarValoresCalculados`).
  - `[exame-execucoes.ts:vincularImagens]` enforces tmp key prefix ownership (`chaveTmpDoPaciente`), `exameCampoColuna.permiteAnexo === true`, R2 `headObject` size verification via `validarArquivo`, and `MAX_ARQUIVOS_POR_COLUNA`, isolating per-image failures into `imagensFalhas` without rolling back the execution. `[exame-imagens.ts:descartarUploadTemporario]` also enforces `chaveTmpDoPaciente`.
  - `[pre-cadastros.ts:vincularArquivosPreCadastro]` enforces `chaveTmpPreCadastroValida` and R2 `headObject` size re-validation, swallowing per-file errors so the `PreCadastro` record still commits.
  - `[exame-imagens.ts:listarImagensExecucao,listarSeriesImagensPaciente]` degrade gracefully to `[]` on R2 `presignGet` failure; `[exame-imagens.ts:salvarAnotacoesImagem]` clears annotations with `Prisma.DbNull` when `null` or empty.
- **CSV import & pagination defaults**:
  - `[movimentos.ts:importMovimentosCsv]` requires non-empty CSV file with valid `nome`/`grauIdeal` rows (auto-detecting optional header containing `"nome"` and `"grau"`, splitting on `/[,;]/`) and upserts atomically in `prisma.$transaction`.
  - `[servicos.ts:getProfissionaisServico]` falls back to all `prisma.user` records when no `usuarioServico` rows are linked.
  - Pagination sizes: `PAGE_SIZE = 10` (`agendamentos.ts`, `categorias.ts`, `evolucoes.ts`, `exames.ts`, `exercicios.ts`, `movimentos.ts`, `pacientes.ts`, `planos.ts`, `pre-cadastros.ts`, `servicos.ts`, `treinos.ts`, `usuarios.ts`), `20` (`contratos.ts`, `despesas.ts`), `30` (`logs.ts`), and `take: 200` cap (`[dashboard.ts:getProximosAgendamentos]`).

## Side Effects

### Database Mutations & Transactions (Prisma)

- **Access & Auth**: `[acessos-compartilhados.ts:getOuCriarAcessoPaciente]` (`acessoCompartilhadoPaciente.create`), `[acessos-compartilhados.ts:revogarAcessoPaciente]` (`acessoCompartilhadoPaciente.update`), `[usuarios.ts:createUsuario,updateUsuario,deleteUsuario]` (`user.create/update/delete`).
- **Patients & Pre-Registrations**: `[pacientes.ts:createPaciente]` (`paciente.create` or `$transaction` with `preCadastro.update`), `[pacientes.ts:updatePaciente]` (`paciente.update`), `[pacientes.ts:deletePaciente]` (`$transaction`: `paciente.updateMany`, `agendamento.updateMany/update`, `gradeRecorrenteAtendimento.updateMany`, `acessoCompartilhadoPaciente.updateMany`, `contrato.updateMany`), `[pacientes.ts:restaurarPaciente]` (`paciente.updateMany`), `[pre-cadastros.ts:criarPreCadastro]` (`preCadastro.create`, `preCadastroArquivo.create`), `[pre-cadastros.ts:rejeitarPreCadastro]` (`preCadastro.updateMany`, `preCadastroArquivo.deleteMany`).
- **Clinical Records & Attachments**: `[documentos-paciente.ts:criarDocumento,atualizarDocumento,excluirDocumento]` (`documentoPaciente.create/update/delete`), `[evolucoes.ts:createEvolucao,updateEvolucao,deleteEvolucao]` (`evolucao.create/update/delete`), `[paciente-anexos.ts:confirmarAnexoPaciente,removerAnexoPaciente]` & `[portal-anexos.ts:confirmarAnexoPortal,removerAnexoPortal]` (delegate DB + storage mutations to `registrarAnexo` / `excluirAnexo` in `@/lib/paciente-anexos`).
- **Scheduling & Recurring Grids**: `[agendamentos.ts:atualizarStatusAgendamento]` (`agendamento.update`), `[agendamentos.ts:remarcarAgendamento,desmarcarAgendamentoPeloPaciente]` (`$transaction`: `agendamento.update` + conditional `creditoRemarcacao.create`), `[agendamentos.ts:criarAgendamentoAssistido]` (`agendamento.create`), `[agendamentos.ts:criarAgendamentoServico]` (`$transaction`: `agendamento.create` + `cobranca.createMany`), `[grade-recorrente.ts:aplicarGradeRecorrente]` (`$transaction`: `agendamento.deleteMany`, `gradeRecorrenteAtendimento.deleteMany/createMany` + `materializarGradeRecorrente`), `[grade-recorrente.ts:materializarGradeRecorrente,materializarGradesPaciente,materializarTodasGrades]` (`agendamento.create`), `[funcionamento.ts:setDiaFuncionamento,createFeriado,deleteFeriado]` (`diaFuncionamento.upsert`, `feriado.create/delete`), `[horarios-atendimento.ts:createHorarioAtendimento,alternarAtivoHorarioAtendimento,deleteHorarioAtendimento]` (`horarioAtendimento.create/update/delete`), `[salas.ts:createSala,updateSala,deleteSala]` (`sala.create/update/delete`), `[portal-agendamentos.ts:portalDesmarcarAgendamento,portalCriarAgendamentoAssistido]` (delegate to `agendamentos.ts`).
- **Plans, Services, Billing, Expenses & Contracts**: `[planos.ts:createPlano,updatePlano,deletePlano]` (`plano.create/delete`, `$transaction` replacing `planoSala` + `plano.update`), `[plano-atribuicoes.ts:createPlanoAtribuicao,updatePlanoAtribuicao,cancelarPlanoAtribuicao,renovarPlanoAtribuicao]` (`$transaction` mutating `planoAtribuicao`, `cobranca`, `agendamento`, `gradeRecorrenteAtendimento`, `contrato`, plus post-transaction `aplicarGradeRecorrente` and `sincronizarContratoDoPlano`), `[servicos.ts:createServico,updateServico,deleteServico]` (`servico.create/delete`, `$transaction` replacing `salaServico` + `usuarioServico` + `servico.update`), `[cobrancas.ts:createCobranca,updateCobranca,marcarCobrancaPaga,deleteCobranca]` (`cobranca.create/update/delete`), `[configuracao-financeira.ts:updateConfiguracaoTaxa]` (`configuracaoTaxa.update`), `[despesas.ts:createDespesa,updateDespesa,marcarDespesaPaga,deleteDespesa]` (`despesa.create/update/delete`), `[contratos.ts:salvarModeloContrato]` (`contratoModelo.create`), `[contratos.ts:gerarContratoDoPlano]` (`sincronizarContratoDoPlano`), `[portal-contratos.ts:conferirCpf]` (`contrato.update` lockout/attempt counters), `[portal-contratos.ts:assinarContrato]` (`contrato.updateMany` to `"ASSINADO"`).
- **Exams & Executions**: `[exames.ts:createExame,deleteExame]` (`exame.create/delete`), `[exames.ts:autosalvarExame]` (`$transaction` creating new `exame` version or in-place nested `exame.update`, plus presence heartbeat), `[exames.ts:sincronizarExame,sairDaEdicaoExame]` (`exameEdicaoPresenca.upsert/deleteMany`), `[exame-execucoes.ts:createAvaliacao,createRetorno]` (`exameExecucao.create`, `exameExecucaoImagem.create`), `[exame-execucoes.ts:updateExecucao]` (`$transaction` replacing `exameExecucaoValor` + `exameExecucao.update`, plus `exameExecucaoImagem.deleteMany/updateMany/create`), `[exame-execucoes.ts:deleteExecucao]` (`exameExecucao.delete`), `[exame-imagens.ts:salvarAnotacoesImagem]` (`exameExecucaoImagem.update`).
- **Libraries & Workouts**: `[categorias.ts:createCategoria,updateCategoria,deleteCategoria]` (`categoria.create/update/delete`), `[exercicios.ts:createExercicio,updateExercicio,deleteExercicio]` (`exercicio.create/delete`, `$transaction` replacing `exercicioLink` + `exercicio.update`), `[movimentos.ts:createMovimento,updateMovimento,deleteMovimento,importMovimentosCsv]` (`movimento.create/update/delete`, batch `$transaction` of `movimento.upsert`), `[treinos.ts:createTreino,updateTreino,deleteTreino,assignTreino]` (`treino.create/delete`, `updateTreinoInPlace`, `$transaction` cloning templates), `[treinos-paciente.ts:updateTreinoPaciente,desativarTreinoPaciente,deleteTreinoPaciente]` (`updateTreinoInPlace`, `treino.update`, `treino.delete`).

### Object Storage (Cloudflare R2), PDF Rendering, Auth Sessions & Headers

- **R2 presigned URLs & object mutations**:
  - `[exame-imagens.ts:solicitarUploadImagem]` (`presignPut`), `[exame-imagens.ts:listarImagensExecucao,listarSeriesImagensPaciente]` (`presignGet`), `[exame-imagens.ts:descartarUploadTemporario]` (`deleteObject`).
  - `[exame-execucoes.ts:vincularImagens,updateExecucao,deleteExecucao]` (`headObject`, `copyObject`, `deleteObject`, best-effort `deleteObjects`).
  - `[paciente-anexos.ts:listarAnexosPaciente,solicitarUploadAnexoPaciente,confirmarAnexoPaciente,removerAnexoPaciente]` and `[portal-anexos.ts:solicitarUploadAnexoPortal,confirmarAnexoPortal,removerAnexoPortal]` (signed upload/download URLs and storage copy/delete via `@/lib/paciente-anexos`).
  - `[pre-cadastros.ts:solicitarUploadPreCadastro]` (`presignPut`), `[pre-cadastros.ts:vincularArquivosPreCadastro]` (`headObject`, `copyObject`, `deleteObject`), `[pre-cadastros.ts:listPreCadastros]` (`presignGet`), `[pre-cadastros.ts:rejeitarPreCadastro]` (`deleteObjects`).
  - `[portal-contratos.ts:liberarContrato]` (`urlDownloadContrato`), `[portal-contratos.ts:assinarContrato]` (`renderToBuffer(ContratoPdfDocument(...))`, `salvarPdfContrato`, `removerPdfContrato` on race-condition rollback, `urlDownloadContrato`, plus request `headers()` inspection for `x-forwarded-for`, `x-real-ip`, `user-agent`).
- **Auth session & redirect**: `[auth.ts:loginAction]` calls NextAuth `signIn("credentials", { email, password, redirectTo: "/dashboard" })`, creating the session and redirecting to `/dashboard`.
- **Console error logging**: `[exame-execucoes.ts:apagarObjetosR2,vincularImagens]`, `[exame-imagens.ts:listarImagensExecucao,descartarUploadTemporario,listarSeriesImagensPaciente]`, `[portal-contratos.ts:assinarContrato]`, and `[pre-cadastros.ts:solicitarUploadPreCadastro,vincularArquivosPreCadastro,rejeitarPreCadastro]` log storage/PDF errors via `console.error`.

### Next.js Cache Revalidations (`revalidatePath`)

- `/agenda`: `[agendamentos.ts:atualizarStatusAgendamento,remarcarAgendamento,desmarcarAgendamentoPeloPaciente,criarAgendamentoAssistido,criarAgendamentoServico]`, `[funcionamento.ts:setDiaFuncionamento,createFeriado,deleteFeriado]`, `[grade-recorrente.ts:salvarGradeRecorrente]`, `[pacientes.ts:deletePaciente]`, `[plano-atribuicoes.ts:createPlanoAtribuicao,updatePlanoAtribuicao]`, `[salas.ts:createSala,updateSala,deleteSala]`.
- `/dashboard`: `[agendamentos.ts:atualizarStatusAgendamento,remarcarAgendamento,desmarcarAgendamentoPeloPaciente,criarAgendamentoAssistido,criarAgendamentoServico]`, `[cobrancas.ts:createCobranca,updateCobranca,marcarCobrancaPaga,deleteCobranca]`, `[despesas.ts:createDespesa,updateDespesa,marcarDespesaPaga,deleteDespesa]`, `[funcionamento.ts:setDiaFuncionamento,createFeriado,deleteFeriado]`, `[grade-recorrente.ts:salvarGradeRecorrente]`, `[pacientes.ts:deletePaciente,restaurarPaciente]`, `[plano-atribuicoes.ts:createPlanoAtribuicao,updatePlanoAtribuicao,cancelarPlanoAtribuicao,renovarPlanoAtribuicao]`.
- `/pacientes` & `/pacientes/${pacienteId}` (plus subroutes `/exames/${execucaoId}`, `/treinos`): `[acessos-compartilhados.ts:getOuCriarAcessoPaciente,revogarAcessoPaciente]`, `[agendamentos.ts:revalidar]`, `[cobrancas.ts:createCobranca,updateCobranca,marcarCobrancaPaga,deleteCobranca]`, `[contratos.ts:gerarContratoDoPlano]`, `[documentos-paciente.ts:criarDocumento,atualizarDocumento,excluirDocumento]`, `[evolucoes.ts:createEvolucao,updateEvolucao,deleteEvolucao]`, `[exame-execucoes.ts:createAvaliacao,createRetorno,updateExecucao,deleteExecucao]`, `[exame-imagens.ts:salvarAnotacoesImagem]`, `[grade-recorrente.ts:salvarGradeRecorrente]`, `[paciente-anexos.ts:confirmarAnexoPaciente,removerAnexoPaciente]`, `[pacientes.ts:createPaciente,updatePaciente,deletePaciente,restaurarPaciente]`, `[plano-atribuicoes.ts:createPlanoAtribuicao,updatePlanoAtribuicao,cancelarPlanoAtribuicao,renovarPlanoAtribuicao]`, `[portal-anexos.ts:confirmarAnexoPortal,removerAnexoPortal]`, `[portal-contratos.ts:assinarContrato]`, `[treinos.ts:assignTreino]`, `[treinos-paciente.ts:updateTreinoPaciente,desativarTreinoPaciente,deleteTreinoPaciente]`.
- `/compartilhado/paciente/${token}`: `[portal-anexos.ts:confirmarAnexoPortal,removerAnexoPortal]`.
- `/cobrancas`, `/contratos`, `/planos`, `/servicos`, `/configuracoes`, `/curadoria`, `/evolucoes`, `/exames`, `/treinos`, `/usuarios`, `/biblioteca/categorias`, `/biblioteca/exercicios`, `/biblioteca-movimento/goniometria`: revalidated by their respective domain mutations (notably `[exames.ts:autosalvarExame]` and `[grade-recorrente.ts:aplicarGradeRecorrente]` intentionally omit `revalidatePath`).

## Verification

- Run: `npm test`
