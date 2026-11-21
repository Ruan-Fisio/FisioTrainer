# contratos

## Overview
UI components for service contract management, versioned template editing, paginated contract listing, status badges, structured text rendering, and public/portal electronic signing (CPF verification, HTML5 canvas signature capture, signed PDF download, and WhatsApp/clipboard sharing).

## Interface
- `[assinar-contrato-fluxo.tsx:AssinarContratoFluxo]` — Client Component (`{ token, primeiroNome, planoNome, numero }`) implementing CPF verification, contract review, signature capture, and signed PDF download.
- `[assinatura-pad.tsx:AssinaturaPad]` — Client Component (`{ rotuloId, onChange }`) rendering a pointer-driven HTML5 canvas signature pad emitting a PNG data URL or `null`.
- `[contrato-acoes.tsx:ContratoAcoes]` — Client Component (`{ contrato, paciente, planoNome }`) rendering staff actions: PDF link for signed contracts, or copy-link and WhatsApp actions for pending contracts.
- `[contrato-do-plano.tsx:PacienteDoContrato]` — Exported type `{ nome: string; contato: string | null; cpf: string | null }`.
- `[contrato-do-plano.tsx:ContratoDoPlano]` — Client Component (`{ contrato, planoAtribuicaoId, planoNome, planoAtivo, pacienteId, paciente? }`) rendering contract generation, status, and actions inside a plan card for staff or portal views.
- `[contrato-status-badge.tsx:STATUS_CONTRATO_LABEL]` — `Record<StatusContrato, string>` mapping `PENDENTE`, `ASSINADO`, `SUBSTITUIDO`, and `CANCELADO` to PT-BR labels.
- `[contrato-status-badge.tsx:ContratoStatusBadge]` — Component (`{ status }`) rendering a status `Badge`.
- `[contrato-texto.tsx:ContratoTexto]` — Component (`{ conteudo }`) rendering structured contract blocks (`titulo`, `secao`, paragraphs) via `blocosContrato`.
- `[contratos-lista.tsx:ContratosLista]` — Async Server Component (`{ page, search, status }`) fetching and displaying paginated contracts in responsive mobile cards and desktop table layouts.
- `[contratos-tabs.tsx:ContratosTabs]` — Client Component (`{ tab, lista, modelo }`) controlling URL-synced `"lista"` and `"modelo"` tabs.
- `[modelo-contrato-form.tsx:ModeloContratoForm]` — Client Component (`{ versao, conteudo, contratadaId, usuarios }`) providing the versioned contract template editor, variable inserter, and live preview.

## Invariants
- `[assinar-contrato-fluxo.tsx:AssinarContratoFluxo]` — Masks CPF with `mascararCpf` and disables confirmation while `enviando || cpf.length < 14`; renders three exclusive states: CPF gate (`!contrato`), signed download view (`contrato.status === "ASSINADO"`, filename `Contrato_${numero}.pdf`), or pending signature form.
- `[assinar-contrato-fluxo.tsx:assinar]` — Guards signing on `contrato?.status === "PENDENTE" && assinatura && aceite`, matching the disabled state (`enviando || !assinatura || !aceite`).
- `[assinatura-pad.tsx:MIN_PONTOS]` — Requires at least 8 total pointer points across strokes to emit a signature; fewer points invoke `onChange(null)`.
- `[assinatura-pad.tsx:LARGURA_EXPORTADA]` — Exports signatures to a fixed `900x300` (`ALTURA_EXPORTADA`) white-background PNG from normalized `0..1` coordinates on an `aspect-[3/1]` canvas, drawn in `#111827` with `lineWidth = Math.max(2.5, w / 200)` (`[assinatura-pad.tsx:desenhar]`).
- `[contrato-acoes.tsx:ContratoAcoes]` — Renders `"Ver PDF"` (`/api/contratos/${contrato.id}/pdf`) only for `status === "ASSINADO"`, copy/WhatsApp controls only for `status === "PENDENTE"`, WhatsApp only when `normalizarTelefoneBr(paciente.contato)` is truthy, and `null` for other statuses; builds signing URLs as `${process.env.NEXT_PUBLIC_APP_URL ?? window.location.origin}/compartilhado/contrato/${token}` (`[contrato-acoes.tsx:urlAssinatura]`).
- `[contrato-do-plano.tsx:ContratoDoPlano]` — When `contrato` is `null`, renders nothing unless both `paciente` and `planoAtivo` are truthy; renders staff `ContratoAcoes` when `paciente` is provided, or a portal `Link` to `/compartilhado/contrato/${contrato.token}` when omitted; displays a missing-CPF warning when `paciente && contrato.status === "PENDENTE" && !paciente.cpf?.trim()`.
- `[contrato-status-badge.tsx:ContratoStatusBadge]` — Maps `ASSINADO` -> `"default"`, `PENDENTE` -> `"secondary"`, `SUBSTITUIDO`/`CANCELADO` -> `"outline"`.
- `[contrato-texto.tsx:ContratoTexto]` — Maps `blocosContrato(conteudo)` types: `"titulo"` -> `h2`, `"secao"` -> `h3`, others -> `p` with `whitespace-pre-line`.
- `[contratos-lista.tsx:NomePaciente]` — Renders soft-deleted patients (`paciente.excluidoEm`) as plain text with `"(paciente excluído)"` instead of linking to `/pacientes/${contrato.pacienteId}?tab=planos`.
- `[contratos-tabs.tsx:mudarTab]` — Switching tabs always deletes list query parameters `page`, `q`, and `status`.
- `[modelo-contrato-form.tsx:ModeloContratoForm]` — Keeps `<Textarea name="conteudo">` mounted (hidden via CSS) in preview mode so form submission still sends `conteudo`; disables variable buttons while `previa` is true; inserts `{{${chave}}}` at the textarea's `selectionStart..selectionEnd` (`[modelo-contrato-form.tsx:inserirVariavel]`).

## Side Effects
- `[assinar-contrato-fluxo.tsx:confirmarCpf]` — Invokes server action `liberarContrato(token, cpf)` inside a transition.
- `[assinar-contrato-fluxo.tsx:assinar]` — Invokes server action `assinarContrato(token, { cpf, conteudoHash, assinatura, aceite })` inside a transition.
- `[assinatura-pad.tsx:AssinaturaPad]` — Attaches a `ResizeObserver` to the canvas (disconnected on unmount) to rescale by `window.devicePixelRatio || 1` and redraw; captures pointer via `setPointerCapture` (`[assinatura-pad.tsx:iniciar]`); allocates an offscreen `<canvas>` via `document.createElement("canvas")` and exports PNG via `toDataURL("image/png")` (`[assinatura-pad.tsx:terminar]`).
- `[contrato-acoes.tsx:copiar]` — Writes signing URL via `navigator.clipboard.writeText` and triggers `toast.success` / `toast.error`.
- `[contrato-acoes.tsx:enviarWhatsapp]` — Opens WhatsApp link in a new tab via `window.open(link, "_blank", "noopener,noreferrer")`.
- `[contrato-do-plano.tsx:ContratoDoPlano]` — Invokes server action `gerarContratoDoPlano(planoAtribuicaoId, pacienteId)` inside a transition and shows `toast.success` / `toast.error`.
- `[contratos-lista.tsx:ContratosLista]` — Awaits server query `listContratos({ q: search, status }, page)` on render.
- `[contratos-tabs.tsx:mudarTab]` — Navigates via ``router.push(`${pathname}?${params.toString()}`)``.
- `[modelo-contrato-form.tsx:ModeloContratoForm]` — Submits to server action `salvarModeloContrato` via `useActionState`, emits `toast.error` / `toast.success` in `useEffect`, and schedules `requestAnimationFrame` in `[modelo-contrato-form.tsx:inserirVariavel]` to refocus and position the caret.

## Verification
- Run: `npm test`
