# documentos

## Overview
Catalog-driven clinical document form package (`DocumentoForm`) that renders per-section cards from `@/lib/documentos-catalogo`, submits form data via React `useActionState`, offers a post-save PDF preview toast action, and navigates back to the patient's documents tab.

## Interface
- `[documento-form.tsx:DocumentoForm]` — Client Component (`"use client"`) accepting `{ tipoSlug: string; pacienteId: string; valores: ValoresDocumento; action: (prev: DocumentoActionState, formData: FormData) => Promise<DocumentoActionState>; mode: "create" | "edit" }`; renders catalog sections as Card groups with text, date, time, textarea, and checkbox fields plus `FormActions`.

## Invariants
- `[documento-form.tsx:DocumentoForm]` — Uses non-null assertion `tipoDocumento(tipoSlug)!`, requiring `tipoSlug` to match a registered document type in `@/lib/documentos-catalogo`.
- `[documento-form.tsx:DocumentoForm]` — Uses `secao.titulo` as section React key and `campo.nome` as field React key and `name` attribute, requiring unique section titles per document and unique field names per section.
- `[documento-form.tsx:DocumentoForm]` — Dispatches `campo.tipo === "checkbox"` to `CampoCheckbox` with `marcado={valores[campo.nome] === true}`; all other field types render `CampoTexto` with non-string `valores[campo.nome]` coerced to `""`.
- `[documento-form.tsx:CampoTexto]` — Renders `<Textarea>` when `campo.tipo === "textarea"` with `maxLength={campo.max}` and `rows` clamped to `[3, 6]`; otherwise renders `<Input>` mapping `"data"` to `date`, `"hora"` to `time`, else `text` (with `maxLength={campo.max}` applied only when `campo.tipo === "texto"`).
- `[documento-form.tsx:CampoTexto]` — Assigns DOM ID `doc-${campo.nome}` and optional help ID `doc-${campo.nome}-ajuda` (`aria-describedby`); renders `{texto.length}/{campo.max}` counter (`text-destructive` when `texto.length >= campo.max`) only when `campo.tipo === "textarea"` and `campo.max` is truthy.
- `[documento-form.tsx:CampoCheckbox]` — Uses DOM ID `doc-${campo.nome}` and uncontrolled `defaultChecked={marcado}`.

## Side Effects
- `[documento-form.tsx:DocumentoForm]` — Submits form data to `action` via `useActionState(action, initialState)`.
- `[documento-form.tsx:DocumentoForm]` — Inside `useEffect`, when `state.success && state.id` is truthy, emits `toast.success` with an `"Abrir PDF"` action calling ``window.open(`/api/documentos/${state.id}/pdf`, "_blank", "noopener")`` and navigates via ``router.push(`/pacientes/${pacienteId}?tab=documentos`)``; emits `toast.error(state.error)` when `state.error` is truthy.
- `[documento-form.tsx:DocumentoForm]` — `FormActions` `onCancel` navigates via ``router.push(`/pacientes/${pacienteId}?tab=documentos`)``.

## Verification
- Run: `npm test`

## Assinatura
- `[aviso-sem-assinatura.tsx:AvisoSemAssinatura]` — Async server component; renders a warning with a link to `/usuarios/{id}` when the session user has no `assinaturaAtualId`, otherwise `null`. Used in the patient Documents tab and on `/pacientes/[id]/documentos/novo`.
