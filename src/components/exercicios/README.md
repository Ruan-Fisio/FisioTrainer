# exercicios

## Overview
UI components (client and async server components) for the exercise library (`/biblioteca/exercicios`): listing and filtering exercises (`ExerciciosTable`, `ExercicioFilters`, `ExercicioTableRow`, `ExercicioCard`), creating/editing exercises with category multi-select and dynamic link inputs (`ExercicioForm`, `CategoriaSelect`), embedding/previewing external links (`ExercicioLinkEmbed`, `LinkPreviewCard`, `LinkPreviewGrid`), deleting exercises (`ExercicioRowActions`), and copying public share links (`ShareButton`).

## Interface
- `[categoria-select.tsx:CategoriaOption]` — Exported type `{ id: string; name: string }`.
- `[categoria-select.tsx:CategoriaSelect]` — Client Component (`{ options: CategoriaOption[]; value: string[]; onChange: (ids: string[]) => void }`) rendering a searchable multi-select popover and removable category badges.
- `[exercicio-filters.tsx:ExercicioFilters]` — Async Server Component (`{ search: string; categoriaIds: string[] }`) rendering `SearchInput` and `MultiSelectFilter` populated from `listAllCategorias()`.
- `[exercicio-form.tsx:ExercicioForm]` — Client Component (`{ action, categoriaOptions, defaultValues?, mode: "create" | "edit" }`) rendering the exercise create/edit form with `CategoriaSelect` and dynamic link inputs/previews.
- `[exercicio-link-embed.tsx:ExercicioLinkEmbed]` — Component (`{ url: string }`) rendering a `youtube-nocookie.com` iframe for YouTube URLs or falling back to `LinkPreviewCard`.
- `[exercicio-list-item.tsx:ExercicioTableRow]` & `[exercicio-list-item.tsx:ExercicioCard]` — Client Components (`{ id, name, categorias, linksCount, previewUrl? }`) rendering clickable desktop table rows and mobile cards with thumbnails and actions.
- `[exercicio-row-actions.tsx:ExercicioRowActions]` — Client Component (`{ id: string; name: string }`) rendering view/edit links and a delete confirmation dialog.
- `[exercicios-table.tsx:ExerciciosTable]` — Async Server Component (`{ page: number; search: string; categoriaIds: string[] }`) rendering paginated exercises in responsive card/table views with `PaginationControls`.
- `[link-preview-card.tsx:LinkPreviewCard]` — Component (`{ url: string }`) rendering a compact external link preview card via `getLinkPreview(url)`.
- `[link-preview-grid.tsx:LinkPreviewGrid]` — Component (`{ urls: string[] }`) rendering a vertical stack (`max-w-md`) of preview tiles (YouTube iframe, image, site, or fallback link).
- `[share-button.tsx:ShareButton]` — Client Component (`{ exercicioId: string }`) copying the shared exercise URL to the clipboard.

## Invariants
- `[categoria-select.tsx:CategoriaSelect]` — Renders selected badges only for categories present in `options` whose `id` is in `value`.
- `[exercicio-filters.tsx:ExercicioFilters]` — Binds the category multi-select filter to URL query parameter `paramName="categorias"`.
- `[exercicio-form.tsx:ExercicioForm]` — Initializes `links` to at least one entry (`[""]` when absent/empty), disables removing a link when `links.length === 1`, marks `name` HTML `required`, and serializes `categoriaIds` (`JSON.stringify(categoriaIds)`) and non-blank `links` (`JSON.stringify(validLinks.map((url) => ({ url })))`) into hidden inputs.
- `[exercicio-link-embed.tsx:ExercicioLinkEmbed]` — Embeds `https://www.youtube-nocookie.com/embed/${preview.videoId}` only when `getLinkPreview(url)?.type === "youtube"`, delegating all other URLs to `LinkPreviewCard`.
- `[exercicio-list-item.tsx:ExercicioThumbnail]` — Renders `preview.thumbnailUrl` for `youtube`, `preview.url` for `image`, and a `Link2` placeholder otherwise.
- `[exercicio-row-actions.tsx:ExercicioRowActions]` — Calls `event.stopPropagation()` on its wrapper so row/card clicks do not fire; disables delete confirmation while `isPending` is true.
- `[exercicios-table.tsx:ExerciciosTable]` — Displays an empty-state card when `exercicios.length === 0`; passes `exercicio.links[0]?.url` as `previewUrl` and `exercicio._count.links` as `linksCount`.
- `[link-preview-card.tsx:LinkPreviewCard]` & `[link-preview-grid.tsx:LinkTile]` — All external `<a>` links set `target="_blank" rel="noopener noreferrer"`; `[link-preview-grid.tsx:LinkPreviewGrid]` keys tiles by `url` (requiring unique URLs) and embeds YouTube via `https://www.youtube.com/embed/${preview.videoId}`.
- `[share-button.tsx:ShareButton]` — Constructs the share URL as `${process.env.NEXT_PUBLIC_APP_URL ?? window.location.origin}/compartilhado/exercicios/${exercicioId}`.

## Side Effects
- `[exercicio-filters.tsx:ExercicioFilters]` — Fetches all categories on server render via `listAllCategorias()`.
- `[exercicio-form.tsx:ExercicioForm]` — Submits `FormData` to `action` via `useActionState`; on `state.success`, emits a Sonner toast and navigates to `/biblioteca/exercicios` via `router.push`; cancel also navigates to `/biblioteca/exercicios`.
- `[exercicio-list-item.tsx:ExercicioTableRow]` & `[exercicio-list-item.tsx:ExercicioCard]` — Navigate to `/biblioteca/exercicios/${id}` via `router.push` on click.
- `[exercicio-row-actions.tsx:ExercicioRowActions]` — Calls server action `deleteExercicio(id)` inside `startTransition`, emitting `toast.success` (and closing the dialog) or `toast.error`.
- `[exercicios-table.tsx:ExerciciosTable]` — Fetches paginated exercises on server render via `listExercicios({ q: search, categoriaIds }, page)`.
- `[share-button.tsx:ShareButton]` — Writes the share URL via `navigator.clipboard.writeText(shareUrl)` and triggers `toast.success` / `toast.error`.

## Verification
- Run: `npm test`
