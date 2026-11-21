# Prisma Data Layer (`prisma`)

## Overview

Defines the PostgreSQL data model (`schema.prisma`) and idempotent baseline seed script (`seed.ts`) for FisioTrainer. `schema.prisma` generates the typed Prisma Client into `../src/generated/prisma` and models users/professionals, exercise and workout prescriptions, versioned clinical exams and executions with Cloudflare R2 media metadata, patients, pre-registrations, shared portal links, care plans, billing, contracts, recurring schedules, appointments, rescheduling credits, clinic configuration, expenses, rate limiting, editing presence, and audit logs. Historical SQL DDL migrations reside in `migrations/` (excluded from package contract generation).

## Interface

### Generator & Datasource
- `[schema.prisma:generator client]` — `provider = "prisma-client"`, `output = "../src/generated/prisma"`.
- `[schema.prisma:datasource db]` — `provider = "postgresql"` (connection string configured externally; no inline `url` field in `schema.prisma`).

### Enums (19)
- `[schema.prisma:TipoCampoExame]` — `NUMERO`, `TEXTO`, `MULTIPLA_ESCOLHA`, `SIM_NAO`, `GONIOMETRIA`, `MEMBRO`, `CALCULADO`.
- `[schema.prisma:DirecaoIdealCampo]` — `MAIOR_MELHOR`, `MENOR_MELHOR`, `PROXIMO_IDEAL`.
- `[schema.prisma:TipoExame]` — `FISIOTERAPIA`, `EDUCACAO_FISICA`.
- `[schema.prisma:Sexo]` — `MASCULINO`, `FEMININO`.
- `[schema.prisma:StatusPreCadastro]` — `PENDENTE`, `APROVADO`, `REJEITADO`.
- `[schema.prisma:OrigemAnexo]` — `CLINICA`, `PACIENTE`.
- `[schema.prisma:StatusCobranca]` — `PENDENTE`, `PAGO`.
- `[schema.prisma:StatusPlanoAtribuicao]` — `ATIVO`, `CANCELADO`, `CONCLUIDO`.
- `[schema.prisma:TipoPlano]` — `FISIOTERAPIA`, `EDUCACAO_FISICA`.
- `[schema.prisma:FormaPagamentoPlano]` — `A_VISTA`, `ATE_3X_CARTAO`.
- `[schema.prisma:PeriodicidadePlano]` — `MENSAL`, `TRIMESTRAL`.
- `[schema.prisma:StatusContrato]` — `PENDENTE`, `ASSINADO`, `SUBSTITUIDO`, `CANCELADO`.
- `[schema.prisma:ModalidadeAgendamento]` — `EDUCACAO_FISICA`, `FISIOTERAPIA`, `AVALIACAO`, `TERAPIA_MANUAL`, `OUTRO`.
- `[schema.prisma:StatusAgendamento]` — `AGENDADO`, `COMPARECEU`, `FALTOU`, `CANCELADO`.
- `[schema.prisma:OrigemRemarcacao]` — `PACIENTE`, `CLINICA`.
- `[schema.prisma:CategoriaDespesa]` — `ALUGUEL`, `ENERGIA`, `AGUA`, `INTERNET_TELEFONE`, `EQUIPAMENTO`, `MATERIAL`, `MANUTENCAO`, `IMPOSTOS`, `SALARIOS`, `SERVICOS_TERCEIROS`, `MARKETING`, `OUTROS`.
- `[schema.prisma:StatusDespesa]` — `PENDENTE`, `PAGO`.
- `[schema.prisma:TipoExecucaoExame]` — `AVALIACAO`, `RETORNO`.
- `[schema.prisma:DiaSemana]` — `SEGUNDA`, `TERCA`, `QUARTA`, `QUINTA`, `SEXTA`, `SABADO`, `DOMINGO`.

### Models (43)
- **Authentication & Professionals**:
  - `[schema.prisma:User]` — Clinic user/professional with credentials, CREF/CREFITO, fiscal/contact metadata, `atendeFisioterapia`, and `atendeEducacaoFisica`; relates to `Evolucao`, `Agendamento`, `GradeRecorrenteAtendimento`, `UsuarioServico`, `ContratoModelo`, and `DocumentoPaciente`.
- **Exercises, Movements & Workouts**:
  - `[schema.prisma:Movimento]` — Goniometry movement reference (`nome`, `grauIdeal`).
  - `[schema.prisma:Categoria]` — Exercise category (`name`; implicit M:N with `Exercicio`).
  - `[schema.prisma:Exercicio]` — Exercise catalog entry (`name`; relates to `Categoria`, `ExercicioLink`, `TreinoDiaExercicio`).
  - `[schema.prisma:ExercicioLink]` — Reference URL attached to `Exercicio`.
  - `[schema.prisma:Treino]` — Workout template or patient-assigned workout (`nome`, `descricao`, optional `paciente`, self-relation `TreinoOrigem` via `treinoOrigemId`, `dataInicio`, `dataFim`, `ativo`; relates to `TreinoDia`).
  - `[schema.prisma:TreinoDia]` — Day schedule within a `Treino` (`diaSemana`, `ordem`; relates to `TreinoDiaExercicio`).
  - `[schema.prisma:TreinoDiaExercicio]` — Prescribed exercise row (`ordem`, `series`, `repeticoes`, `carga`, `descanso`, `instrucoes`; belongs to `TreinoDia` and `Exercicio`).
- **Versioned Clinical Exams & Executions**:
  - `[schema.prisma:Exame]` — Versioned exam template (`nome`, `tipo`, `sombra`, `variaveis`/`tabelas` JSON, `versaoAtual`, self-relation `VersoesExame` via `exameOrigemId`; relates to `ExameSecao`, `ExameExecucao`).
  - `[schema.prisma:ExameSecao]` — Ordered section within an `Exame` (`nome`, `ordem`, `origemId`; relates to `ExameCampo`).
  - `[schema.prisma:ExameCampo]` — Ordered field within an `ExameSecao` (`nome`, `ordem`, `repetivel`, `identificarMembro`, `origemId`; relates to `ExameCampoColuna`).
  - `[schema.prisma:ExameCampoColuna]` — Column definition within an `ExameCampo` (`titulo`, `ordem`, `tipo`, `formatacao`, `opcoes`, `multiplaSelecao`, `opcoesCondicionais`, `coresOpcoes`, `pontuacoes`, `permiteAnexo`, `valorIdeal`, `direcaoIdeal`, `formula`, `origemId`; relates to `ExameExecucaoValor`).
  - `[schema.prisma:ExameExecucao]` — Executed exam evaluation or follow-up (`tipo`, `data`, self-relation `AvaliacaoRetornos` via `avaliacaoId`; belongs to `Exame` and `Paciente`; relates to `ExameExecucaoValor`, `ExameExecucaoImagem`).
  - `[schema.prisma:ExameExecucaoValor]` — Persisted exam cell value (`valor`, `linha`; belongs to `ExameExecucao` and `ExameCampoColuna`).
  - `[schema.prisma:ExameExecucaoImagem]` — R2 image metadata attached to `(execucaoId, colunaId, linha)` with optional `anotacoes` JSON (`chave`, `nomeOriginal`, `mime`, `tamanho`; belongs to `ExameExecucao`).
  - `[schema.prisma:ExameEdicaoPresenca]` — Real-time exam template editing presence heartbeat (`exameId`, `usuarioId`, `usuarioNome`, `vistoEm`).
- **Patients, Clinical Records & Public Portal**:
  - `[schema.prisma:Paciente]` — Patient record (demographics, clinical history, soft-delete `excluidoEm`; relates to `ExameExecucao`, `Evolucao`, `Cobranca`, `Agendamento`, `PlanoAtribuicao`, `Treino`, `AcessoCompartilhadoPaciente`, `PreCadastro`, `PacienteAnexo`, `Contrato`, `DocumentoPaciente`).
  - `[schema.prisma:PreCadastro]` — Public pre-registration submission (`nome`, `sobrenome`, `celular`, `queixaPrincipal`, `status`, `motivoRejeicao`, `analisadoEm`, optional 1:1 `pacienteId`; relates to `PreCadastroArquivo`).
  - `[schema.prisma:PreCadastroArquivo]` — R2 attachment metadata uploaded via public pre-registration (`chave`, `nomeOriginal`, `mime`, `tamanho`; belongs to `PreCadastro`).
  - `[schema.prisma:PacienteAnexo]` — Patient R2 attachment metadata (`chave`, `nomeOriginal`, `mime`, `tamanho`, `origem`; belongs to `Paciente`).
  - `[schema.prisma:DocumentoPaciente]` — Fillable clinical PDF document instance (`tipo`, `valores` JSON; belongs to `Paciente`, optional `autor` `User`).
  - `[schema.prisma:AcessoCompartilhadoPaciente]` — Token-based public patient portal link (`token`, `ativo`, `expiraEm`, `ultimoAcessoEm`; belongs to `Paciente`).
  - `[schema.prisma:Evolucao]` — Clinical evolution note (vitals `pa`/`fc`/`spo2`/`fr`/`temperatura`/`auscultaPulmonar`, `hdp`, `hda`, `evolucao`, `conduta`; belongs to `User` `profissional` and `Paciente`).
- **Plans, Contracts, Billing & Expenses**:
  - `[schema.prisma:Plano]` — Care plan template (`nome`, `tipos`, `atendimentos`, `creditosRemarcacao`, `permiteParcelamentoEstendido`, `valorAVistaMensal`, `valorAVistaTrimestral`; relates to `PlanoSala`, `PlanoAtribuicao`).
  - `[schema.prisma:PlanoSala]` — Join model linking `Plano` to allowed `Sala` with optional `descricao`.
  - `[schema.prisma:PlanoAtribuicao]` — Patient plan assignment (`planoNome`, `atendimentos`, `creditosRemarcacao`, `formaPagamento`, `periodicidade`, `valorOriginal`, `desconto`, `valor`, `cartao`, `notaFiscal`, `numeroParcelas`, `dataInicio`, `status`; relates to `Paciente`, optional `Plano`, `Cobranca`, `Agendamento`, `CreditoRemarcacao`, `GradeRecorrenteAtendimento`, `Contrato`).
  - `[schema.prisma:ContratoModelo]` — Append-only contract template version (`versao`, `conteudo`, optional `contratada` `User`).
  - `[schema.prisma:Contrato]` — Contract tied to `Paciente` and `PlanoAtribuicao` (`numero`, `token`, `status`, `tentativasCpf`, `bloqueadoAte`, frozen `conteudo`/`conteudoHash`/`modeloVersao`/`dadosPlanoHash`, signature metadata, `pdfChave`/`pdfHash`).
  - `[schema.prisma:Cobranca]` — Billing installment/charge (`planoNome`, `valorBase`, `valor`, `vencimento`, `status`, `pagoEm`, `numeroParcela`, `totalParcelas`, `notaFiscal`, `taxaProfissional`; belongs to `Paciente`, optional `PlanoAtribuicao`, optional `Servico`).
  - `[schema.prisma:ConfiguracaoTaxa]` — Configurable financial fee percentage (`chave`, `nome`, `percentual`).
  - `[schema.prisma:Despesa]` — Clinic expense record (`descricao`, `categoria`, `valor`, `data`, `status`, `pagoEm`, `fornecedor`, `numeroDocumento`, `observacao`).
- **Services, Rooms & Scheduling**:
  - `[schema.prisma:Servico]` — Custom standalone clinic service (`nome`, `ativo`, `valorPadrao`, `taxaProfissionalPercentual`; relates to `SalaServico`, `UsuarioServico`, `Agendamento`, `Cobranca`).
  - `[schema.prisma:Sala]` — Clinic room with per-modality capacity (`nome`, `ordem`, `capacidadeEducacaoFisica`, `capacidadeFisioterapia`; relates to `PlanoSala`, `SalaServico`, `Agendamento`).
  - `[schema.prisma:SalaServico]` — Join model configuring `capacidade` and optional `descricao` per `(Sala, Servico)`.
  - `[schema.prisma:UsuarioServico]` — Join model enabling a `User` to deliver a custom `Servico`.
  - `[schema.prisma:HorarioAtendimento]` — Configured fixed appointment time slot (`modalidade`, `horario`, `duracaoMin`, `ativo`, `ordem`).
  - `[schema.prisma:DiaFuncionamento]` — Clinic open/closed flag per `DiaSemana` (`diaSemana`, `aberto`).
  - `[schema.prisma:Feriado]` — Clinic holiday date (`data`, `descricao`).
  - `[schema.prisma:GradeRecorrenteAtendimento]` — Weekly recurring schedule rule for a `PlanoAtribuicao` (`modalidade`, `diaSemana`, `horario`, optional `profissional`, `ativo`; relates to materialized `Agendamento`).
  - `[schema.prisma:Agendamento]` — Scheduled appointment (`titulo`, M:N `pacientes`, optional `profissional`, `dataInicio`, `dataFim`, `diaInteiro`, `modalidade`, `status`, `observacao`, `serieId`, `slotData`, optional `planoAtribuicao`/`gradeRecorrente`/`sala`/`servico`; relates to `CreditoRemarcacao`).
  - `[schema.prisma:CreditoRemarcacao]` — Rescheduling credit consumption audit row (`origem`, `justificativa`; belongs to `PlanoAtribuicao`, optional `Agendamento`).
- **Security & Auditing**:
  - `[schema.prisma:LimiteTentativa]` — Rate-limiting / brute-force counter (`chave` PK, `tentativas`, `janelaInicio`, `bloqueadoAte`, `bloqueios`, `atualizadoEm`).
  - `[schema.prisma:AuditLog]` — Write-operation audit log (`criadoEm`, `usuarioId`, `usuarioNome`, `modulo`, `acao`, `registroId`, `resumo`, `dados` JSON).

### Seed Entry Point & Subdirectories
- `[seed.ts:main]` — Top-level async seed entry point (not exported; invoked automatically on module evaluation) using module-scoped `PrismaPg` (`[seed.ts:adapter]`) and `PrismaClient` (`[seed.ts:prisma]`).
- `migrations/` — Historical Prisma SQL DDL migration folders (unlinked; excluded from package contracts).

## Invariants

- **Primary Keys**: `[schema.prisma:LimiteTentativa.chave]` uses a natural string `@id` (no default) and `[schema.prisma:ExameEdicaoPresenca]` uses composite `@@id([exameId, usuarioId])`; all other 41 models use `@id @default(cuid())`.
- **Single-Column Uniqueness**:
  - `[schema.prisma:User.email]`, `[schema.prisma:Movimento.nome]`, `[schema.prisma:Categoria.name]`, `[schema.prisma:Paciente.cpf]` (nullable), `[schema.prisma:PreCadastro.pacienteId]` (nullable 1:1 link to `Paciente`) are `@unique`.
  - `[schema.prisma:PacienteAnexo.chave]`, `[schema.prisma:PreCadastroArquivo.chave]`, and `[schema.prisma:ExameExecucaoImagem.chave]` are `@unique` (unique R2 object keys).
  - `[schema.prisma:AcessoCompartilhadoPaciente.token]` (`@unique @default(cuid())`), `[schema.prisma:Contrato.token]` (`@unique`), `[schema.prisma:Contrato.numero]` (`@unique @default(autoincrement())`), and `[schema.prisma:ContratoModelo.versao]` (`@unique`).
  - `[schema.prisma:Plano.nome]`, `[schema.prisma:Servico.nome]`, `[schema.prisma:Sala.nome]`, `[schema.prisma:DiaFuncionamento.diaSemana]`, `[schema.prisma:Feriado.data]` (`@db.Date`), and `[schema.prisma:ConfiguracaoTaxa.chave]` are `@unique`.
- **Composite Uniqueness**:
  - `[schema.prisma:PlanoSala]` enforces `@@unique([planoId, salaId])`.
  - `[schema.prisma:SalaServico]` enforces `@@unique([salaId, servicoId])`.
  - `[schema.prisma:UsuarioServico]` enforces `@@unique([usuarioId, servicoId])`.
  - `[schema.prisma:HorarioAtendimento]` enforces `@@unique([modalidade, horario])`.
- **Referential Integrity (`onDelete`)**:
  - **Restrict**: `[schema.prisma:PlanoSala.sala]` specifies explicit `onDelete: Restrict`; `[schema.prisma:Evolucao.profissional]` and `[schema.prisma:TreinoDiaExercicio.exercicio]` omit `onDelete` on required foreign keys (PostgreSQL/Prisma default restrict behavior).
  - **Cascade**: `[schema.prisma:ExercicioLink.exercicio]`, `[schema.prisma:ExameSecao.exame]`, `[schema.prisma:ExameCampo.secao]`, `[schema.prisma:ExameCampoColuna.campo]`, `[schema.prisma:PacienteAnexo.paciente]`, `[schema.prisma:DocumentoPaciente.paciente]`, `[schema.prisma:PreCadastroArquivo.preCadastro]`, `[schema.prisma:AcessoCompartilhadoPaciente.paciente]`, `[schema.prisma:Evolucao.paciente]`, `[schema.prisma:Cobranca.paciente]`, `[schema.prisma:PlanoSala.plano]`, `[schema.prisma:PlanoAtribuicao.paciente]`, `[schema.prisma:Contrato.paciente]`, `[schema.prisma:Contrato.planoAtribuicao]`, `[schema.prisma:GradeRecorrenteAtendimento.planoAtribuicao]`, `[schema.prisma:SalaServico.sala]`, `[schema.prisma:SalaServico.servico]`, `[schema.prisma:UsuarioServico.usuario]`, `[schema.prisma:UsuarioServico.servico]`, `[schema.prisma:CreditoRemarcacao.planoAtribuicao]`, `[schema.prisma:ExameExecucao.exame]`, `[schema.prisma:ExameExecucao.paciente]`, `[schema.prisma:ExameExecucao.avaliacao]`, `[schema.prisma:ExameExecucaoValor.execucao]`, `[schema.prisma:ExameExecucaoValor.coluna]`, `[schema.prisma:ExameExecucaoImagem.execucao]`, `[schema.prisma:Treino.paciente]`, `[schema.prisma:TreinoDia.treino]`, and `[schema.prisma:TreinoDiaExercicio.treinoDia]` specify `onDelete: Cascade`.
  - **SetNull**: `[schema.prisma:Exame.origem]`, `[schema.prisma:PreCadastro.paciente]`, `[schema.prisma:DocumentoPaciente.autor]`, `[schema.prisma:Cobranca.planoAtribuicao]`, `[schema.prisma:Cobranca.servico]`, `[schema.prisma:PlanoAtribuicao.plano]`, `[schema.prisma:ContratoModelo.contratada]`, `[schema.prisma:GradeRecorrenteAtendimento.profissional]`, `[schema.prisma:Agendamento.profissional]`, `[schema.prisma:Agendamento.planoAtribuicao]`, `[schema.prisma:Agendamento.gradeRecorrente]`, `[schema.prisma:Agendamento.sala]`, `[schema.prisma:Agendamento.servico]`, `[schema.prisma:CreditoRemarcacao.agendamento]`, and `[schema.prisma:Treino.origem]` specify `onDelete: SetNull`.
- **Precision & Temporal Column Constraints**:
  - `@db.Decimal(10, 2)` on `[schema.prisma:Cobranca]` (`valorBase`, `valor`, `taxaProfissional`), `[schema.prisma:Plano]` (`valorAVistaMensal`, `valorAVistaTrimestral`), `[schema.prisma:PlanoAtribuicao]` (`valorOriginal`, `desconto`, `valor`), `[schema.prisma:Servico.valorPadrao]`, and `[schema.prisma:Despesa.valor]`.
  - `@db.Decimal(5, 2)` on `[schema.prisma:Servico.taxaProfissionalPercentual]` and `[schema.prisma:ConfiguracaoTaxa.percentual]`.
  - `@db.Decimal(6, 2)` on `[schema.prisma:TreinoDiaExercicio.carga]`.
  - `@db.Timestamptz(3)` on `[schema.prisma:Paciente.excluidoEm]`, `[schema.prisma:Contrato]` (`bloqueadoAte`, `assinadoEm`), `[schema.prisma:Agendamento]` (`dataInicio`, `dataFim`), and `[schema.prisma:Despesa]` (`data`, `pagoEm`).
  - `@db.Date` on `[schema.prisma:Agendamento.slotData]` and `[schema.prisma:Feriado.data]`.
- **Schema Defaults**:
  - `[schema.prisma:User]` (`atendeFisioterapia = false`, `atendeEducacaoFisica = false`), `[schema.prisma:Exame]` (`tipo = FISIOTERAPIA`, `sombra = false`, `variaveis = "[]"`, `tabelas = "[]"`, `versaoAtual = true`), `[schema.prisma:ExameCampo]` (`repetivel = false`, `identificarMembro = false`), `[schema.prisma:ExameCampoColuna]` (`opcoes = []`, `multiplaSelecao = false`, `opcoesCondicionais = "[]"`, `coresOpcoes = "[]"`, `pontuacoes = "[]"`, `permiteAnexo = false`).
  - `[schema.prisma:PreCadastro.status]` (`PENDENTE`), `[schema.prisma:PacienteAnexo.origem]` (`CLINICA`), `[schema.prisma:AcessoCompartilhadoPaciente.ativo]` (`true`), `[schema.prisma:Cobranca]` (`status = PENDENTE`, `notaFiscal = false`), `[schema.prisma:Plano]` (`creditosRemarcacao = 0`, `permiteParcelamentoEstendido = false`), `[schema.prisma:PlanoAtribuicao]` (`creditosRemarcacao = 0`, `periodicidade = MENSAL`, `desconto = 0`, `cartao = false`, `notaFiscal = false`, `status = ATIVO`), `[schema.prisma:Contrato]` (`status = PENDENTE`, `tentativasCpf = 0`).
  - `[schema.prisma:GradeRecorrenteAtendimento.ativo]` (`true`), `[schema.prisma:Servico]` (`ativo = true`, `valorPadrao = 0`, `taxaProfissionalPercentual = 0`), `[schema.prisma:Agendamento]` (`diaInteiro = false`, `modalidade = FISIOTERAPIA`, `status = AGENDADO`), `[schema.prisma:HorarioAtendimento]` (`duracaoMin = 50`, `ativo = true`, `ordem = 0`), `[schema.prisma:Sala]` (`ordem = 0`, `capacidadeEducacaoFisica = 0`, `capacidadeFisioterapia = 0`), `[schema.prisma:DiaFuncionamento.aberto]` (`true`), `[schema.prisma:Despesa.status]` (`PENDENTE`).
  - `[schema.prisma:LimiteTentativa]` (`tentativas = 0`, `janelaInicio = now()`, `bloqueios = 0`, `atualizadoEm = now() @updatedAt`), `[schema.prisma:ExameEdicaoPresenca.vistoEm]` (`now()`), `[schema.prisma:ExameExecucao.data]` (`now()`), `[schema.prisma:ExameExecucaoValor.linha]` (`0`), `[schema.prisma:ExameExecucaoImagem.linha]` (`0`), `[schema.prisma:Treino.ativo]` (`true`), `[schema.prisma:TreinoDia.ordem]` (`0`), `[schema.prisma:TreinoDiaExercicio.ordem]` (`0`).
- **Documented Domain Invariants in `schema.prisma`**:
  - `[schema.prisma:Paciente.excluidoEm]` — Soft-delete timestamp: non-null marks a patient logically deleted; patients are never hard-deleted.
  - `[schema.prisma:TipoCampoExame.CALCULADO]` — Computed on screen load from `[schema.prisma:ExameCampoColuna.formula]`, never stored in `[schema.prisma:ExameExecucaoValor]`, and only exists on non-repeatable fields; `[schema.prisma:ExameCampoColuna.opcoesCondicionais]` and `[schema.prisma:ExameCampoColuna.pontuacoes]` are populated only when all options have entries (`pontuacoes` are never stored on execution).
  - `[schema.prisma:Cobranca.servicoId]` — Populated only for standalone service charges, mutually exclusive with `planoAtribuicaoId`; `[schema.prisma:Cobranca.taxaProfissional]` is a creation-time snapshot never recalculated; `[schema.prisma:Agendamento.servicoId]` is populated only when `modalidade === OUTRO`.
  - `[schema.prisma:ContratoModelo]` — Append-only versioning where highest `versao` is active; `[schema.prisma:Contrato]` is rendered dynamically while `PENDENTE` and freezes `conteudo` and evidence only upon signature.
  - `[schema.prisma:Agendamento.slotData]` — Idempotency key for recurring schedule generation that remains on the original date even after rescheduling; `[schema.prisma:ExameExecucaoImagem]` keys on `(execucaoId, colunaId, linha)` rather than `ExameExecucaoValor` because cell values are recreated on edit.
- **Seed Invariants**:
  - `[seed.ts:adapter]` — Requires `process.env.DATABASE_URL` (loaded via `import "dotenv/config"`) to initialize `PrismaPg`.
  - `[seed.ts:main]` — Insert-only idempotency: every seed write uses `upsert` with `update: {}`, leaving existing records untouched on re-runs.
  - `[seed.ts:main]` — Hashes passwords with `bcryptjs` cost factor 10 (`"admin"` for `admin@admin.com`, `crypto.randomUUID()` for system sentinel user `id: "sem-usuario"` / `email: "sem-usuario@sistema.local"`).

## Side Effects

- `[schema.prisma:generator client]` — Generates Prisma Client source files into `../src/generated/prisma` during Prisma code generation.
- `[seed.ts:dotenv/config]` — Mutates `process.env` at import time by loading `.env`.
- `[seed.ts:adapter]` / `[seed.ts:prisma]` — Instantiates PostgreSQL `PrismaPg` adapter and `PrismaClient` at module load time.
- `[seed.ts:main]` — Executes immediately on module load and performs 25 PostgreSQL `upsert` writes: 2 `User` rows (`admin@admin.com`, `sem-usuario@sistema.local`), 1 `Sala` row (`sala_cinesioterapia`), 7 `DiaFuncionamento` rows (`SEGUNDA`–`SABADO` open, `DOMINGO` closed), 14 `HorarioAtendimento` rows (7 hourly slots `07:00`–`10:00`, `14:00`–`16:00` × `EDUCACAO_FISICA` and `FISIOTERAPIA`, `duracaoMin: 50`), and 1 `ConfiguracaoTaxa` row (`PARCELAMENTO_CARTAO`, `percentual: 2.3`).
- `[seed.ts:main]` — Writes completion message to stdout (`console.log`), writes uncaught errors to stderr (`console.error`) and exits with code `1` (`process.exit(1)`), and unconditionally calls `await prisma.$disconnect()` in `.finally(...)`.

## Verification

- Run: `npm test`
