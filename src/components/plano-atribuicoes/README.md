# Plano Atribuicoes Components

## Overview
Provides UI components for managing patient plan assignments (`plano-atribuicoes`): a recurring schedule editor (`GradeSection`), a create/edit assignment form with installment, card-fee, and discount calculators (`PlanoAtribuicaoForm`), per-assignment receipt/edit/cancel actions (`PlanoAtribuicaoRowActions`), and a list splitting active and historical assignments (`PlanoAtribuicoesList`).

## Interface
- `[grade-section.tsx:GradeOpcoes]`: Type alias `Awaited<ReturnType<typeof getGradeRecorrenteOpcoes>>`.
- `[grade-section.tsx:ModalidadePlano]`: Union type `"EDUCACAO_FISICA" | "FISIOTERAPIA"`.
- `[grade-section.tsx:profissionalAtende]`: Function `(p: GradeOpcoes["profissionais"][number], modalidade: ModalidadeAgendamento) => boolean`.
- `[grade-section.tsx:GradeSection]`: Client component (`"use client"`) accepting `{ linhas: GradeRecorrenteLinha[]; onChange: (linhas: GradeRecorrenteLinha[]) => void; modalidades: ModalidadePlano[]; atendimentos: number | null; opcoes: GradeOpcoes; bare?: boolean }` (default `bare = false`).
- `[plano-atribuicao-form.tsx:PlanoAtribuicaoForm]`: Client component (`"use client"`) accepting `{ action: (prevState: PlanoAtribuicaoActionState, formData: FormData) => Promise<PlanoAtribuicaoActionState>; planosAtivos: PlanoAtivo[]; taxaParcelamentoCartao: number; defaultValues?: { planoId: string; formaPagamento: FormaPagamentoPlano; periodicidade: PeriodicidadePlano; vencimentos: string[]; descontoTipo?: DescontoTipo; descontoValor?: number; valorAlvoParcela?: number; gradeLinhas?: GradeRecorrenteLinha[] }; pacienteId: string; mode: "create" | "edit"; gradeOpcoes: GradeOpcoes }`.
- `[plano-atribuicao-row-actions.tsx:PlanoAtribuicaoRowActions]`: Client component (`"use client"`) accepting `{ id: string; pacienteId: string }`.
- `[plano-atribuicoes-list.tsx:PlanoAtribuicoesList]`: Component accepting `{ atribuicoes: Atribuicao[]; pacienteId: string; showActions?: boolean; pacienteContrato?: PacienteDoContrato }` (default `showActions = true`).

## Invariants
- `[grade-section.tsx:profissionalAtende]`: Returns `p.atendeFisioterapia` for `"FISIOTERAPIA"`, `p.atendeEducacaoFisica` for `"EDUCACAO_FISICA"`, and `true` otherwise.
- `[grade-section.tsx:GradeSection]`: Disables adding schedule rows when `atendimentos != null && linhas.length >= atendimentos` (`noLimite`); new rows default to `modalidade: modalidades[0]`, `diaSemana: "SEGUNDA"`, `profissionalId: undefined`, and either the first fixed slot or `"08:00"` (`novaLinha`); changing `modalidade` resets `profissionalId` and `horario` (`atualizar`); renders `<NativeSelect>` for fixed-slot modalities and `<Input type="time">` otherwise (`usaSelectHorario`), and shows modality selection only when `modalidades.length > 1`.
- `[plano-atribuicao-form.tsx:PlanoAtribuicaoForm]`: Renders an empty-state message linking to `/planos/novo` when `planosAtivos.length === 0 && !defaultValues`.
- `[plano-atribuicao-form.tsx:formaEfetivaAtual]`: Derives payment method via `formaEfetiva(periodicidade, formaPagamento, permiteParcelamentoEstendido)` and clamps `vencimentos` and `wizardQuantidade` whenever `maxParcelas` shrinks; `MENSAL` plans without extended installment support allow only a single cash installment.
- `[plano-atribuicao-form.tsx:valorOriginal]`: Applies `calcularValorParcelado(base, taxaParcelamentoCartao, numeroParcelas)` only when `cartaoDaForma(formaEfetivaAtual)` is truthy; `[plano-atribuicao-form.tsx:valorAlvoEfetivo]` auto-fills target installment value until manually edited (`valorAlvoTocado`) and warns when `valorAlvo * numeroParcelas >= valorOriginal`.
- `[plano-atribuicao-form.tsx:vencimentos]`: Prevents deleting the last installment (`vencimentos.length === 1`), allows adding only while `vencimentos.length < maxParcelas`, sorts preview dates ascending at `T12:00:00`, and distributes `valorFinal` via `gerarValoresParcelas`.
- `[plano-atribuicao-form.tsx:modalidadesGrade]`: Filters `planoSelecionado.tipos` to `"EDUCACAO_FISICA" | "FISIOTERAPIA"`, rendering `<GradeSection>` only when non-empty and filtering submitted `gradeLinhasEfetivas` accordingly; submits serialized hidden inputs for `formaPagamento`, `periodicidade`, `descontoTipo`, `descontoValor`, `valorAlvoParcela`, `gradeLinhas`, and each non-empty `vencimentos` date.
- `[plano-atribuicao-form.tsx:handleSubmit]`: In `mode === "edit"`, intercepts initial submit (`e.preventDefault()`) and requires confirmation in a `Dialog` before setting `confirmadoRef.current = true` and calling `requestSubmit()`.
- `[plano-atribuicao-row-actions.tsx:PlanoAtribuicaoRowActions]`: Requires `Dialog` confirmation to cancel and disables confirm while `isPending` is `true`.
- `[plano-atribuicoes-list.tsx:PlanoAtribuicoesList]`: Partitions `atribuicoes` into `ativas` (`status === "ATIVO"`) and `historico` (`status !== "ATIVO"`), rendering `historico` inside a collapsed `<CollapsibleSection defaultOpen={false}>` with `showActions={false}`; `[plano-atribuicoes-list.tsx:AtribuicaoCard]` maps statuses `ATIVO`, `CANCELADO`, `CONCLUIDO`, shows discount info only when `atribuicao.desconto > 0`, and passes `atribuicao.contratos[0] ?? null` to `ContratoDoPlano`.

## Side Effects
- `[grade-section.tsx:GradeSection]`: Invokes parent-supplied `onChange` callback on row additions, edits, or removals.
- `[plano-atribuicao-form.tsx:PlanoAtribuicaoForm]`: Submits `FormData` to `action` via `useActionState`; calls `formRef.current?.requestSubmit()` in `confirmarSalvar`; on `state.success` in `useEffect`, invokes `toast.success(...)` and navigates via ``router.push(`/pacientes/${pacienteId}?tab=planos`)``; `FormActions` cancel also navigates to `/pacientes/${pacienteId}?tab=planos`.
- `[plano-atribuicao-row-actions.tsx:handleCancelar]`: Invokes server action `cancelarPlanoAtribuicao(id, pacienteId)` inside `startTransition`, triggering `toast.success(...)` and closing dialog on success or `toast.error(...)` on error; renders receipt link to `/api/plano-atribuicoes/${id}/comprovante` (`target="_blank"`) and edit `<Link>` to `/pacientes/${pacienteId}/planos/${id}/editar`.

## Verification
- Run: `npm test`
