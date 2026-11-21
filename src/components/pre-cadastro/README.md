# Pre-Cadastro Components

## Overview
Provides client components for the public pre-registration (`pré-cadastro`) form, combining masked phone input, word-counted chief complaint validation, server-action submission, and immediate direct-to-storage file uploads via presigned PUT URLs.

## Interface
- `[arquivos-upload.tsx:ArquivosUpload]`: Client component (`"use client"`) accepting `{ sessaoId: string; onEnviandoChange: (enviando: boolean) => void }`; renders a multi-file input (`id="anexos"`), hidden inputs `sessaoUpload` and `arquivos` (JSON array of `{ chave, nomeOriginal }`), and an upload status/removal list.
- `[pre-cadastro-form.tsx:PreCadastroForm]`: Client component (`"use client"`) taking no props; renders the pre-registration form (`nome`, `sobrenome`, `celular`, `queixaPrincipal`, and `ArquivosUpload`) wired to `criarPreCadastro` via `useActionState`, or a confirmation card when `state.success` is truthy.

## Invariants
- `[arquivos-upload.tsx:handleFiles]`: Validates every selected file via `validarArquivo(file.name, file.size)` (`@/lib/storage-keys`), skipping invalid files with an error message, and caps non-error active items plus newly accepted files at `MAX_ARQUIVOS_PRE_CADASTRO`.
- `[arquivos-upload.tsx:ArquivosUpload]`: Disables file input when non-error items (`status !== "erro"`) reach `MAX_ARQUIVOS_PRE_CADASTRO`, resets input via `inputKey` increment after selection, disables per-item removal while `item.status === "enviando"`, and serializes into hidden input `arquivos` only items with `status === "ok"` and truthy `chave`.
- `[arquivos-upload.tsx:enviar]`: Sets PUT `Content-Type` header via `mimeEfetivo(file.type)` and marks item status as `"erro"` if `"error" in ticket` or `!put.ok`.
- `[pre-cadastro-form.tsx:PreCadastroForm]`: Marks `nome`, `sobrenome`, `celular`, and `queixaPrincipal` as HTML `required`, formats `celular` on every change via `mascararCelular`, checks chief complaint word count via `contarPalavras(queixa) > LIMITE_PALAVRAS_QUEIXA` (setting `aria-invalid`), and disables submit whenever `pending || excedeu || enviandoArquivos`.

## Side Effects
- `[arquivos-upload.tsx:enviar]`: Invokes server action `solicitarUploadPreCadastro({ sessaoId, nome, mime, tamanho })` (`@/actions/pre-cadastros`) on file selection and uploads each accepted file via `fetch(ticket.url, { method: "PUT", headers: { "Content-Type": mimeEfetivo(file.type) }, body: file })`.
- `[arquivos-upload.tsx:handleFiles]`: Calls `crypto.randomUUID()` to generate per-item IDs; notifies parent via `onEnviandoChange(itens.some((i) => i.status === "enviando"))` in `useEffect`.
- `[pre-cadastro-form.tsx:PreCadastroForm]`: Calls `crypto.randomUUID()` in a lazy `useState` initializer for `sessaoId` and submits `FormData` to server action `criarPreCadastro` (`@/actions/pre-cadastros`) via `useActionState`.

## Verification
- Run: `npm test`
