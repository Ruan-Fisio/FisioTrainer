# curadoria

## Overview
UI components for the pre-registration curation queue (`Fila de Curadoria`): a paginated server-rendered list grouped by status (`PreCadastrosList`), an attachment/complaint inspection dialog (`PreCadastroVisualizarDialog`), a rejection confirmation dialog (`RejeitarDialog`), and a one-click clipboard button for the public `/pre-cadastro` URL (`CopiarLinkButton`).

## Interface
- `[copiar-link-button.tsx:CopiarLinkButton]` — Client Component (no props) rendering an outline button that copies `${window.location.origin}/pre-cadastro`.
- `[pre-cadastro-visualizar-dialog.tsx:AnexoPreCadastro]` — Attachment DTO type (`{ id: string; nomeOriginal: string; mime: string; tamanho: number; url: string }`).
- `[pre-cadastro-visualizar-dialog.tsx:PreCadastroVisualizarDialog]` — Client Component accepting `{ nome: string; celular: string; createdAt: Date; queixaPrincipal: string; anexos: AnexoPreCadastro[] }`; renders a dialog with masked phone, timestamp, chief complaint, and multi-format attachment viewer.
- `[pre-cadastros-list.tsx:PreCadastrosList]` — Async Server Component accepting `{ status: StatusPreCadastro; page: number; search: string }`; renders paginated pre-registration cards, status-gated actions, and `PaginationControls`.
- `[rejeitar-dialog.tsx:RejeitarDialog]` — Client Component accepting `{ id: string; nome: string }`; renders a dialog form with an optional `motivo` textarea to reject a pre-registration.

## Invariants
- `[copiar-link-button.tsx:copiar]` — Always constructs `${window.location.origin}/pre-cadastro` and catches clipboard failures to show the URL in an error toast.
- `[pre-cadastro-visualizar-dialog.tsx:PreCadastroVisualizarDialog]` — Resets `indice` to `0` on dialog open; clamps current attachment index via `Math.min(indice, anexos.length - 1)`; disables prev/next controls at `[0, anexos.length - 1]`; renders the external `"Abrir"` link only when `atual.url` is truthy and `tipoPreview(atual.mime) !== null`; renders thumbnails only when `anexos.length > 1`.
- `[pre-cadastro-visualizar-dialog.tsx:Visualizador]` — Shows an unavailable message when `!anexo.url`; otherwise switches on `tipoPreview(anexo.mime)` (`"imagem"`, `"pdf"`, `"video"`, `"audio"`) with a fallback download control.
- `[pre-cadastro-visualizar-dialog.tsx:formatarTamanho]` — Formats sizes `>= 1024 * 1024` as MB (1 decimal) and smaller sizes as KB with a minimum of `1 KB`.
- `[pre-cadastros-list.tsx:VAZIO]` — Exhaustive `Record<StatusPreCadastro, string>` empty-state copy for `"PENDENTE"`, `"REJEITADO"`, and `"APROVADO"`.
- `[pre-cadastros-list.tsx:PreCadastrosList]` — Gates UI elements by `status` and nullable fields: analysis badge (`status !== "PENDENTE" && item.analisadoEm`), rejection reason (`status === "REJEITADO" && item.motivoRejeicao`), patient link (`/pacientes/${item.pacienteId}` when `status === "APROVADO" && item.pacienteId`), and WhatsApp/`RejeitarDialog`/approval link (`/pacientes/novo?preCadastro=${item.id}`) only when `status === "PENDENTE"`.
- `[rejeitar-dialog.tsx:RejeitarDialog]` — Caps `motivo` textarea at `maxLength={500}`, disables Cancel and Submit while `pending`, closes and emits success toast only when `result.success` is truthy, and renders `state.error` inside `<p role="alert">`.

## Side Effects
- `[copiar-link-button.tsx:copiar]` — Calls `navigator.clipboard.writeText(url)` and emits `toast.success` / `toast.error`.
- `[pre-cadastro-visualizar-dialog.tsx:PreCadastroVisualizarDialog]` — Mutates local `indice` state and loads external attachment URLs via `<img>`, `<iframe>`, `<video>`, `<audio>`, or anchor downloads/new tabs (`target="_blank" rel="noreferrer"`).
- `[pre-cadastros-list.tsx:PreCadastrosList]` — Queries pre-registrations on render by awaiting `listPreCadastros({ status, q: search }, page)`.
- `[rejeitar-dialog.tsx:RejeitarDialog]` — Invokes server action `rejeitarPreCadastro(id, prev, formData)` via `useActionState`, triggering `toast.success` and closing the dialog when `result.success` is truthy.

## Verification
- Run: `npm test`
