# src/lib/validations

## Overview

Zod validation schemas, option tuples, label maps, and parsing helpers defining input contracts across FisioTrainer's domain forms and server actions (scheduling, billing, expenses, clinical evolutions, exams, plans, pre-registration, rooms, custom services, workouts, and users).

## Interface

- `[agendamento.ts:repeticaoOptions]`, `[agendamento.ts:unidadeRecorrenciaOptions]`, `[agendamento.ts:terminoRecorrenciaOptions]` — Readonly option tuples for recurrence mode (`"NAO_REPETE" | "DIARIA" | "SEMANAL" | "MENSAL" | "ANUAL" | "PERSONALIZADA"`), unit (`"DIA" | "SEMANA" | "MES" | "ANO"`), and termination (`"NUNCA" | "EM_DATA" | "APOS_N"`).
- `[agendamento.ts:agendamentoSchema]` — Zod schema validating appointment details and recurrence settings.
- `[agendamento.ts:combinarDataHora]` — Function `(data: string, hora: string) => Date` combining date and time strings in the configured `TIMEZONE` via `fromZonedTime`.
- `[categoria.ts:categoriaSchema]` — Zod schema validating exercise categories (`{ name }`).
- `[cobranca.ts:cobrancaSchema]` — Zod schema validating billing records (`{ planoNome, valor, vencimento, status, observacao, notaFiscal }`).
- `[configuracao-financeira.ts:configuracaoTaxaSchema]` — Zod schema validating clinic fee percentage (`{ percentual }`).
- `[despesa.ts:parseValorMonetario]` — Function `(texto: string) => number` parsing Brazilian or dot-decimal monetary strings rounded to 2 decimal places (or `NaN`).
- `[despesa.ts:despesaSchema]` — Zod schema validating clinic expenses and transforming date/payment fields.
- `[evolucao.ts:evolucaoSchema]` — Zod schema validating clinical evolution records (`hdp`, `hda`, vital signs, optional `auscultaPulmonar`, `evolucao`, `conduta`).
- `[exame-execucao.ts:exameExecucaoValorSchema]`, `[exame-execucao.ts:exameExecucaoSchema]` — Zod schemas validating exam execution submissions and cell values (`{ colunaId, valor, linha }`).
- `[exame-imagens.ts:imagemNovaSchema]`, `[exame-imagens.ts:imagensFormSchema]`, `[exame-imagens.ts:ImagemNova]`, `[exame-imagens.ts:parseImagensForm]` — Zod schemas, inferred type, and `FormData` JSON parser for exam image additions and removals.
- `[exame.ts:exameColunaSchema]`, `[exame.ts:exameCampoSchema]`, `[exame.ts:exameSecaoSchema]`, `[exame.ts:exameSchema]` — Hierarchical Zod schemas validating exam templates, columns, conditional options, scoring, variables, and reference tables.
- `[exercicio.ts:exercicioSchema]` — Zod schema validating exercise records (`{ name, categoriaIds, links }`).
- `[funcionamento.ts:feriadoSchema]` — Zod schema validating clinic holidays (`{ data, descricao }`).
- `[grade-recorrente.ts:diaSemanaValues]`, `[grade-recorrente.ts:modalidadeAgendamentoValues]`, `[grade-recorrente.ts:gradeRecorrenteLinhaSchema]`, `[grade-recorrente.ts:gradeRecorrenteSchema]`, `[grade-recorrente.ts:GradeRecorrenteLinha]`, `[grade-recorrente.ts:ModalidadeGradeRecorrente]` — Tuples, schemas, and inferred types for recurring weekly schedule grids.
- `[horario-atendimento.ts:horarioAtendimentoSchema]` — Zod schema validating attendance time slots (`{ modalidade, horario, duracaoMin }`).
- `[movimento.ts:movimentoSchema]` — Zod schema validating goniometry movement references (`{ nome, grauIdeal }`).
- `[paciente.ts:pacienteSchema]` — Zod schema validating patient registration and clinical history fields.
- `[plano-atribuicao.ts:MAX_PARCELAS_PLANO_HARD_CAP]` — Constant `6` capping installment count on plan assignment.
- `[plano-atribuicao.ts:renovarPlanoSchema]`, `[plano-atribuicao.ts:planoAtribuicaoSchema]` — Zod schemas validating plan renewal and plan assignment (payment method, installments, and discount rules).
- `[plano.ts:tipoPlanoValues]`, `[plano.ts:tipoPlanoLabels]`, `[plano.ts:formaPagamentoPlanoValues]`, `[plano.ts:formaPagamentoPlanoLabels]`, `[plano.ts:periodicidadePlanoValues]`, `[plano.ts:periodicidadePlanoLabels]` — Domain tuples and PT-BR label maps for plan types, payment methods, and billing periods.
- `[plano.ts:valorSchema]`, `[plano.ts:planoSalaSchema]`, `[plano.ts:planoSchema]` — Zod schemas for positive Brazilian-formatted currency parsing, room bindings, and plan definitions.
- `[pre-cadastro.ts:LIMITE_PALAVRAS_QUEIXA]` — Constant `2000` capping word count in chief complaint text.
- `[pre-cadastro.ts:preCadastroSchema]`, `[pre-cadastro.ts:rejeitarPreCadastroSchema]`, `[pre-cadastro.ts:arquivosPreCadastroSchema]`, `[pre-cadastro.ts:parseArquivosPreCadastro]`, `[pre-cadastro.ts:solicitarUploadPreCadastroSchema]` — Zod schemas and JSON parser for public patient pre-registration, rejection, and temporary attachment uploads.
- `[sala.ts:salaSchema]` — Zod schema validating clinic rooms and per-modality capacities.
- `[servico.ts:salaServicoSchema]`, `[servico.ts:servicoSchema]`, `[servico.ts:agendamentoServicoPagamentoSchema]` — Zod schemas validating custom services, room capacities, professional assignments, and one-off appointment payments.
- `[treino.ts:treinoDiaExercicioSchema]`, `[treino.ts:treinoDiaSchema]`, `[treino.ts:treinoSchema]`, `[treino.ts:atribuirTreinoSchema]` — Zod schemas validating workout plans, workout days, exercise prescriptions, and patient assignments.
- `[usuario.ts:usuarioSchema]`, `[usuario.ts:usuarioUpdateSchema]`, `[usuario.ts:loginSchema]` — Zod schemas validating user creation, user profile updates, and login credentials.

## Invariants

- `[agendamento.ts:agendamentoSchema]` — `titulo`, `data`, `horaInicio`, and `horaFim` must be non-empty trimmed strings; `modalidade` is restricted to `["EDUCACAO_FISICA", "FISIOTERAPIA", "AVALIACAO", "TERAPIA_MANUAL"]` and `status` to `["AGENDADO", "COMPARECEU", "FALTOU", "CANCELADO"]`; optional `intervalo` and `terminoOcorrencias` must be integers `>= 1`; `diasSemana` entries must be integers `0..6`; refinement enforces `diaInteiro || horaFim >= horaInicio` (error attached to `["horaFim"]`).
- `[agendamento.ts:combinarDataHora]` — Interprets `${data}T${hora}:00` strictly in the imported `TIMEZONE` via `fromZonedTime`.
- `[categoria.ts:categoriaSchema]` — `name` trimmed length must be `>= 2`.
- `[cobranca.ts:cobrancaSchema]` — `planoNome` trimmed min 1; `valor` strips `.`, replaces `,` with `.`, and must parse to a finite number `>= 0`; `vencimento` transforms to `new Date("${v}T12:00:00")`; `status` is `"PENDENTE" | "PAGO"`; `notaFiscal` accepts `"true" | "false"` and transforms to boolean.
- `[configuracao-financeira.ts:configuracaoTaxaSchema]` — `percentual` normalizes Brazilian decimal formatting and must fall within `[0, 100]`.
- `[despesa.ts:parseValorMonetario]` — Strips an optional leading `R$`, accepts only `/^\d{1,3}(\.\d{3})+(,\d{1,2})?$/`, `/^\d+(,\d{1,2})?$/`, or `/^\d+\.\d{1,2}$/`, rounds to 2 decimals, and returns `NaN` on any other input.
- `[despesa.ts:despesaSchema]` — `descricao` trimmed `1..200`; `categoria` must belong to `CATEGORIAS_DESPESA`; `valor` must parse via `parseValorMonetario` into `(0, 99_999_999.99]`; `data` must match `/^\d{4}-\d{2}-\d{2}$/`, lie within `["2000-01-01", "2100-12-31"]`, and round-trip as a real calendar date via `combinarDataHora`/`toDateInputValue`; `fornecedor` and `numeroDocumento` max `200` (empty maps to `null`); `observacao` max `2000` (empty maps to `null`); `superRefine` requires a valid non-future `pagoEm` (`<= toDateInputValue(new Date())`) when `status === "PAGO"`; transform converts `data` via `combinarDataHora(d.data, "12:00")` and forces `pagoEm` to `null` whenever `status !== "PAGO"`.
- `[evolucao.ts:evolucaoSchema]` — `hdp`, `hda`, `pa`, `fc`, `spo2`, `fr`, `temperatura`, `evolucao`, and `conduta` must be non-empty trimmed strings; `auscultaPulmonar` is optional.
- `[exame-execucao.ts:exameExecucaoValorSchema]` & `[exame-execucao.ts:exameExecucaoSchema]` — `exameId` and `colunaId` require length `>= 1`; `linha` is an integer `>= 0` (default `0`).
- `[exame-imagens.ts:imagemNovaSchema]`, `[exame-imagens.ts:imagensFormSchema]`, & `[exame-imagens.ts:parseImagensForm]` — `chave` `1..500`, `colunaId` `1..100`, `linha` integer `0..1000`, `nomeOriginal` `<= 300`; at most `500` new images and `500` removed IDs (`1..100` each); `parseImagensForm` never throws on malformed JSON or schema failure, returning `{ imagens: [], removidas: [] }`.
- `[exame.ts:exameColunaSchema]`, `[exame.ts:exameCampoSchema]`, `[exame.ts:exameSecaoSchema]`, & `[exame.ts:exameSchema]` — Optional IDs must match `/^[A-Za-z0-9_-]{1,64}$/`; `tipo` is restricted to `["NUMERO", "TEXTO", "MULTIPLA_ESCOLHA", "SIM_NAO", "GONIOMETRIA", "MEMBRO", "CALCULADO"]`; `coresOpcoes` values must be `""` or in `CORES_OPCAO`; `MULTIPLA_ESCOLHA` requires `opcoes.length >= 2`, while non-`MULTIPLA_ESCOLHA` columns forbid `opcoesCondicionais` and `usaPontuacao`; `exameSchema` requires `nome` trimmed `>= 2`, `tipo` in `["FISIOTERAPIA", "EDUCACAO_FISICA"]`, at least one section/field/column, and runs `superRefine` delegating to `validarTabelas`, `compilarTabelas`, and `validarFormulasDoExameDetalhado` to attach formula and table errors to exact nested paths.
- `[exercicio.ts:exercicioSchema]` — `name` trimmed `>= 2`; `categoriaIds` min 1; `links` min 1 valid trimmed URL.
- `[funcionamento.ts:feriadoSchema]` — `data` matches `/^\d{4}-\d{2}-\d{2}$/`; `descricao` trimmed `2..120`.
- `[grade-recorrente.ts:gradeRecorrenteLinhaSchema]` & `[grade-recorrente.ts:gradeRecorrenteSchema]` — `horario` matches `/^\d{2}:\d{2}$/`; empty `profissionalId` transforms to `undefined`; `linhas` max `21`; `superRefine` rejects duplicate `(modalidade, diaSemana, horario)` tuples.
- `[horario-atendimento.ts:horarioAtendimentoSchema]` — `horario` matches `/^([01]\d|2[0-3]):[0-5]\d$/`; `duracaoMin` coerced integer `5..480` (default `60`).
- `[movimento.ts:movimentoSchema]` — `nome` trimmed `>= 2`; `grauIdeal` trimmed `>= 1`.
- `[paciente.ts:pacienteSchema]` — `nome` trimmed `>= 2`; optional `sexo` in `["MASCULINO", "FEMININO"]`; optional `idade` coerced positive integer; optional `email` valid email or empty string.
- `[plano-atribuicao.ts:renovarPlanoSchema]` & `[plano-atribuicao.ts:planoAtribuicaoSchema]` — `primeiraData` matches `/^\d{4}-\d{2}-\d{2}$/`; `numeroParcelas` coerced integer `>= 1`; `vencimentos` must have `1..MAX_PARCELAS_PLANO_HARD_CAP` (`6`) entries transformed to `new Date("${v}T12:00:00")`; discount refinements require `descontoValor > 0` for `"VALOR"`, `0 < descontoValor <= 100` for `"PERCENTUAL"`, and `valorAlvoParcela > 0` for `"ALVO_PARCELA"`.
- `[plano.ts:valorSchema]` & `[plano.ts:planoSchema]` — `valorSchema` requires positive Brazilian-formatted numbers (`> 0`); `planoSchema` requires `tipos.length >= 1`, integer `atendimentos >= 1`, integer `creditosRemarcacao >= 0`, parsed JSON `salas.length > 0`, and allows `permiteParcelamentoEstendido` only when `tipos` includes both `"FISIOTERAPIA"` and `"EDUCACAO_FISICA"`.
- `[pre-cadastro.ts:preCadastroSchema]`, `[pre-cadastro.ts:rejeitarPreCadastroSchema]`, `[pre-cadastro.ts:arquivosPreCadastroSchema]`, `[pre-cadastro.ts:parseArquivosPreCadastro]`, & `[pre-cadastro.ts:solicitarUploadPreCadastroSchema]` — `nome`/`sobrenome` trimmed `>= 2`; `celular` validated via `celularValido` and normalized via `soDigitos`; `queixaPrincipal` trimmed `>= 10` chars and `<= LIMITE_PALAVRAS_QUEIXA` (`2000`) words via `contarPalavras`; `motivo` max `500`; attachments bounded by `MAX_ARQUIVOS_PRE_CADASTRO` with `chave` `1..500` and `nomeOriginal` `1..300`; `parseArquivosPreCadastro` returns `[]` on invalid input and deduplicates by `chave`; upload requests bound `sessaoId <= 60`, `nome <= 300`, `mime <= 100`, integer `tamanho`.
- `[sala.ts:salaSchema]` — `nome` trimmed `2..80`; `capacidadeEducacaoFisica` and `capacidadeFisioterapia` coerced integers `0..100`.
- `[servico.ts:salaServicoSchema]`, `[servico.ts:servicoSchema]`, & `[servico.ts:agendamentoServicoPagamentoSchema]` — `servicoSchema` requires `nome` trimmed `>= 2`, positive `valorPadrao`, `taxaProfissionalPercentual` in `[0, 100]`, JSON `salas` with unique `salaId` values and integer `capacidade >= 1`, and non-empty JSON `profissionais`; `agendamentoServicoPagamentoSchema` requires `valor > 0`, valid `YYYY-MM-DD` `vencimentos`, and `vencimentos.length <= maxParcelasPlano("TRIMESTRAL", formaPagamento)`.
- `[treino.ts:treinoDiaExercicioSchema]`, `[treino.ts:treinoDiaSchema]`, `[treino.ts:treinoSchema]`, & `[treino.ts:atribuirTreinoSchema]` — `nome` trimmed `>= 2`, `descricao` max `280`, `dias` min 1 (`diaSemana` in `DIAS_SEMANA`), `exercicios` min 1 per day with positive optional `series`/`descanso` ints and `carga` number; `atribuirTreinoSchema` requires `treinoIds.length >= 1` and non-empty `pacienteId`.
- `[usuario.ts:usuarioSchema]`, `[usuario.ts:usuarioUpdateSchema]`, & `[usuario.ts:loginSchema]` — `name` trimmed `>= 2`, valid trimmed `email`; `password` min `4` on creation (`optional` or `""`, min `4` when provided on update; min `1` on login); `atendeFisioterapia` and `atendeEducacaoFisica` default to `false`.

## Side Effects

- None

## Verification

- Run: `npm test`
