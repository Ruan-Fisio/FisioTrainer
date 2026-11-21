# exame-execucoes

## Overview
UI components for running, viewing, editing, comparing, and reporting clinical exam executions (`avaliações` and `retornos`): the multi-section execution form with live formulas, shadow history, goniometry, and temporary R2 file uploads (`ExameExecucaoForm`), read-only execution rendering (`ExecucaoValores`, `ValorColuna`, `ValorCalculado`), patient evaluation tabs (`AvaliacoesList`), multi-step quick comparison modal and Recharts trend charts (`ComparacaoRapidaDialog`, `ComparacaoRapidaGrafico`), printable comparison bar charts (`RelatorioBarChart`), follow-up selector (`RetornoSelect`), PDF download trigger (`BaixarPdfButton`), and execution edit/delete actions (`ExecucaoDetailActions`).

## Interface
- `[exame-execucao-form.tsx:ExameCompleto]` — Exam template DTO type including `id`, `nome`, `tipo` (`"FISIOTERAPIA" | "EDUCACAO_FISICA"`), optional `variaveis`/`tabelas`, and nested `secoes` -> `campos` -> `colunas`.
- `[exame-execucao-form.tsx:ExameExecucaoForm]` — Client Component (`{ action, exames, fixedExameId?, defaultValores?, valoresSombra?, cancelHref, successLabel, movimentos, paciente?, pacienteId, execucaoId?, imagensIniciais? }`) rendering the full exam execution/edit form.
- `[avaliacoes-list.tsx:AvaliacoesList]` — Client Component (`{ pacienteId: string; avaliacoes: Awaited<ReturnType<typeof getAvaliacoesByPaciente>> }`) rendering tabbed evaluation cards and nested return links.
- `[baixar-pdf-button.tsx:BaixarPdfButton]` — Component (`{ execucaoId: string; retornoId: string }`) rendering a PDF download anchor for an execution/return pair.
- `[comparacao-rapida-dialog.tsx:ComparacaoRapidaDialog]` — Client Component (`{ avaliacaoId: string; avaliacaoData: Date; retornos: { id: string; data: Date }[] }`) implementing a 3-step comparison modal (`"selecao"` -> `"campos"` -> `"resultado"`).
- `[comparacao-rapida-grafico.tsx:ComparacaoRapidaGrafico]` — Client Component (`{ serie: SerieNumerica; execucoes: { id: string; data: Date }[] }`) rendering a Recharts `AreaChart` and delta/percentage summary card.
- `[execucao-detail-actions.tsx:ExecucaoDetailActions]` — Client Component (`{ id: string; pacienteId: string; tipo: "AVALIACAO" | "RETORNO" }`) providing edit navigation and a delete confirmation dialog.
- `[execucao-detalhe.tsx:Execucao]` — Type alias `NonNullable<Awaited<ReturnType<typeof getExecucao>>>`.
- `[execucao-detalhe.tsx:ValorCalculado]` — Component (`{ resultado: ResultadoFormula | undefined }`) displaying formatted formula results, errors, or `"—"`.
- `[execucao-detalhe.tsx:ValorColuna]` — Component (`{ tipo, multiplaSelecao, valor, coresOpcoes? }`) formatting stored column values by field type and option colors.
- `[execucao-detalhe.tsx:ExecucaoValores]` — Component (`{ execucao: Execucao; imagens?: ImagemExame[] }`) rendering execution sections, repeatable rows, computed formulas, and per-cell attachments.
- `[goniometria-field.tsx:MovimentoOption]` — Type `{ id: string; nome: string; grauIdeal: string }`.
- `[goniometria-field.tsx:MovimentoGrauEntry]` — Re-exported type from `@/lib/goniometria`.
- `[goniometria-field.tsx:GoniometriaField]` — Client Component (`{ options: MovimentoOption[]; value: MovimentoGrauEntry[]; onChange: (entries: MovimentoGrauEntry[]) => void; comLado?: boolean }`) for selecting movements, achieved degrees, and optional laterality.
- `[imagens-campo.tsx:UploadItem]` — Type `{ id: string; nome: string; previewUrl: string; status: "enviando" | "ok" | "erro"; chave?: string; erro?: string }`.
- `[imagens-campo.tsx:ImagensCampo]` — Client Component (`{ titulo, existentes, enviados, removidas, onAdicionar, onRemoverEnviado, onAlternarRemocao }`) managing existing and newly uploaded attachments for a cell.
- `[relatorio-bar-chart.tsx:RelatorioBarChart]` — Component (`{ titulo, itens, sufixo? }`) rendering a print-friendly evaluation-vs-return bar comparison chart.
- `[retorno-select.tsx:RetornoSelect]` — Client Component (`{ retornos: { id: string; data: Date }[]; value: string }`) selecting a return execution via query string.

## Invariants
- `[exame-execucao-form.tsx:LINHA_UNICA]` — Non-repeatable fields always use row ID `"0"`; value and attachment maps use composite keys `${colunaId}::${linhaId}` (`chaveValor` / `chaveImagem`).
- `[exame-execucao-form.tsx:construirEstadoInicial]` — Repeatable rows sort ascending by `linha` and key as `linha-${numeroLinha}` so saved images bind back via `/^linha-(\d+)$/`; repeatable fields only allow deleting rows when `linhas.length > 1` (`[exame-execucao-form.tsx:SecaoFields]`).
- `[exame-execucao-form.tsx:SecaoFields]` — Columns with `tipo === "CALCULADO"` are never hidden by `ocultarColuna`, never render attachments, and are excluded from serialized `valoresJson`; `MULTIPLA_ESCOLHA` columns with `opcoesCondicionais.length > 0` ignore manual clicks and stay synced into `valores` via `useEffect`.
- `[exame-execucao-form.tsx:ExameExecucaoForm]` — `colunaOculta` evaluates only the immutable initial `valoresSombra` snapshot (`estadoInicial.chavesSombraIniciais`); `imagensJson` serializes only uploads with `status === "ok" && item.chave`; submission is disabled while `enviandoImagens` is true; `remapImagens` hidden input is emitted only when `execucaoId` is present; `handleExameChange` clears all execution, row, shadow, step, upload, and removal state.
- `[avaliacoes-list.tsx:AvaliacoesList]` — Defaults to `"FISIOTERAPIA"` and partitions strictly by `a.exame.tipo === "FISIOTERAPIA"` and `"EDUCACAO_FISICA"`; renders `ComparacaoRapidaDialog` and nested returns only when `avaliacao.retornos.length > 0` (`[avaliacoes-list.tsx:AvaliacoesListContent]`).
- `[baixar-pdf-button.tsx:BaixarPdfButton]` — Targets `/api/execucoes/${execucaoId}/relatorio?retornoId=${retornoId}` (`target="_blank" rel="noopener noreferrer"`).
- `[comparacao-rapida-dialog.tsx:ComparacaoRapidaDialog]` — Always fixes the base evaluation as checked/disabled, disables confirm while `selecionados.size === 0 || pending`, resets all dialog state on close (`[comparacao-rapida-dialog.tsx:handleOpenChange]`), caps selected numeric series at `MAX_CAMPOS_GRAFICO` (`[comparacao-rapida-dialog.tsx:toggleCampo]`), and skips step `"campos"` when `seriesDados.length === 0` (`[comparacao-rapida-dialog.tsx:handleConfirmar]`).
- `[comparacao-rapida-grafico.tsx:ComparacaoRapidaGrafico]` — Assumes positional alignment between `serie.pontos` and `execucoes`, disables null bridging (`connectNulls={false}`) and animation (`isAnimationActive={false}`), scopes gradient IDs with `useId()`, and formats non-integers to 2 comma-decimal places (`[comparacao-rapida-grafico.tsx:formatarNumero]`).
- `[execucao-detail-actions.tsx:ExecucaoDetailActions]` — Warns about cascading return deletion only when `tipo === "AVALIACAO"` and disables confirmation while `isPending` is true.
- `[execucao-detalhe.tsx:ExecucaoValores]` — Indexes values by `${colunaId}::${linha}`, evaluates exam-level formulas on row `0` via `calcularColunas` and repeatable formulas via `calcularLinhasRepetiveis`, and matches attachments by `i.colunaId === coluna.id && i.linha === linha`.
- `[goniometria-field.tsx:OPCOES_LADO]` — Restricts sides to `["Esquerdo", "Direito", "Bilateral"]` (shown only when `comLado` is true); `[goniometria-field.tsx:addMovimento]` disallows duplicate movements when `comLado` is false.
- `[imagens-campo.tsx:handleFiles]` — Validates each file via `validarArquivo(file.name, file.size)` and enforces `MAX_ARQUIVOS_POR_COLUNA` across non-removed `existentes` plus non-error `enviados`; upload removal is disabled while `item.status === "enviando"` (`[imagens-campo.tsx:ImagensCampo]`).
- `[relatorio-bar-chart.tsx:RelatorioBarChart]` — Returns `null` when `itens.length === 0`, scales bars against `Math.max(1, ...values)` with `ALTURA_PLOT = 150` and minimum `2px` height, and applies `break-inside-avoid`; `[retorno-select.tsx:RetornoSelect]` hides in print (`print:hidden`).

## Side Effects
- `[exame-execucao-form.tsx:ExameExecucaoForm]` — Submits serialized execution data (`exameId`, `valores`, `imagens`, `imagensRemovidas`, optional `remapImagens`) to `action` via `useActionState`, emits Sonner toasts, and navigates to `cancelHref` via `router.push`.
- `[exame-execucao-form.tsx:ExameExecucaoForm]` — Calls server action `solicitarUploadImagem` and performs `fetch(ticket.url, { method: "PUT", ... })` uploads to temporary storage; calls `descartarUploadTemporario` on upload removal; allocates and revokes browser object URLs (`URL.createObjectURL` / `URL.revokeObjectURL`); syncs computed automatic multiple-choice selections into `valores` via `useEffect`.
- `[baixar-pdf-button.tsx:BaixarPdfButton]` — Opens `/api/execucoes/${execucaoId}/relatorio?retornoId=${retornoId}` in a new browser tab.
- `[comparacao-rapida-dialog.tsx:handleConfirmar]` — Invokes server action `getComparacaoRapida(avaliacaoId, Array.from(selecionados))` inside `startTransition`, emits `toast.error` on failure, and links to `/api/execucoes/${avaliacaoId}/comparacao-rapida-pdf?...` in a new tab.
- `[execucao-detail-actions.tsx:handleDelete]` — Invokes server action `deleteExecucao(id, pacienteId)` inside `startTransition`, displays `toast.success` / `toast.error`, closes the dialog, and navigates via ``router.push(`/pacientes/${pacienteId}`)``.
- `[retorno-select.tsx:RetornoSelect]` — Navigates via ``router.push(`${pathname}?retornoId=${e.target.value}`)`` on change, replacing existing query params.
- `[goniometria-field.tsx:GoniometriaField]` & `[imagens-campo.tsx:ImagensCampo]` — Mutate local UI state and invoke parent callbacks (`onChange`, `onAdicionar`, `onRemoverEnviado`, `onAlternarRemocao`).

## Verification
- Run: `npm test`
