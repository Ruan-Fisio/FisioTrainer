# Filters Components

## Overview
Provides client-side URL-driven filter and pagination controls (`"use client"`) that read current query parameters via Next.js App Router navigation hooks (`useRouter`, `usePathname`, `useSearchParams`) and navigate with updated query strings while resetting pagination on filter changes.

## Interface
- `[date-range-filter.tsx:DateRangeFilter]`: Client component accepting `{ fromParamName?: string; toParamName?: string; defaultFrom: string; defaultTo: string }` (defaults `"de"`, `"ate"`).
- `[mes-filter.tsx:MesFilter]`: Client component accepting `{ mes: string; mesAtual: string; paramName?: string }` (default `"mes"`).
- `[multi-select-filter.tsx:MultiSelectOption]`: Type `{ id: string; label: string }`.
- `[multi-select-filter.tsx:MultiSelectFilter]`: Client component accepting `{ paramName: string; options: MultiSelectOption[]; placeholder?: string; icon?: ReactNode; defaultValue: string[] }` (default placeholder `"Filtrar..."`).
- `[pagination-controls.tsx:PaginationControls]`: Client component accepting `{ page: number; totalPages: number }`.
- `[search-input.tsx:SearchInput]`: Client component accepting `{ paramName?: string; placeholder?: string; defaultValue: string }` (defaults `"q"`, `"Buscar..."`).
- `[toggle-filter.tsx:ToggleFilter]`: Client component accepting `{ paramName: string; label: string; icon?: ReactNode; active: boolean }`.
- `[periodo-filter.tsx:PeriodoFilter]`: Client component accepting `{ dias: number; opcoes: readonly number[]; paramName?: string }`; grade de botões que grava `?dias=` na URL (usado em `/metrics`).

## Invariants
- `[date-range-filter.tsx:updateParam]`: Sets `name` when `value` is truthy, deletes `name` when empty/falsy, preserves other search params, and always deletes `"page"`.
- `[mes-filter.tsx:MesFilter]`: Shifts `mes` by `-1` or `+1` via `deslocarMes`, formats the label via `rotuloMesExtenso(mes)`, and renders the "Mês atual" reset button only when `mes !== mesAtual`.
- `[mes-filter.tsx:irPara]`: Sets `paramName` (default `"mes"`) to `destino`, preserves other search params, and always deletes `"page"`.
- `[multi-select-filter.tsx:MultiSelectFilter]`: Derives `selected` from `defaultValue`, renders the count badge only when `selected.length > 0`, and renders removable badges only for options included in `selected`.
- `[multi-select-filter.tsx:updateSelection]`: Serializes IDs with `buildListParam(ids)`, sets `paramName` when truthy or deletes it otherwise, and always deletes `"page"`.
- `[pagination-controls.tsx:PaginationControls]`: Returns `null` when `totalPages <= 1`; renders 1-indexed pages `1..totalPages` with `isActive={p === page}`, clamps previous/next targets to `[1, totalPages]`, and disables + calls `e.preventDefault()` on previous when `page <= 1` and on next when `page >= totalPages`.
- `[pagination-controls.tsx:hrefFor]`: Preserves existing search params and sets `"page"` to `String(targetPage)`.
- `[search-input.tsx:handleSearch]`: Sets `paramName` when `term` is truthy, deletes it when empty/falsy, and always deletes `"page"`.
- `[toggle-filter.tsx:toggle]`: Deletes `paramName` when `active` is `true`, sets `paramName` to `"1"` when `active` is `false`, and always deletes `"page"`.

## Side Effects
- `[date-range-filter.tsx:updateParam]`: Navigates via ``router.push(`${pathname}?${params.toString()}`)`` on date input changes.
- `[mes-filter.tsx:irPara]`: Navigates via ``router.push(`${pathname}?${params.toString()}`, { scroll: false })`` on month navigation clicks.
- `[multi-select-filter.tsx:updateSelection]`: Navigates via ``router.push(`${pathname}?${params.toString()}`)`` when toggling options or removing badges.
- `[pagination-controls.tsx:PaginationControls]`: Navigates via `router.push(hrefFor(p))` on `PaginationLink` clicks and link `href` navigation on previous/page/next controls.
- `[search-input.tsx:handleSearch]`: Schedules a `350` ms debounced callback via `useDebouncedCallback` wrapping ``router.push(`${pathname}?${params.toString()}`)`` in React `startTransition`.
- `[toggle-filter.tsx:toggle]`: Navigates via ``router.push(`${pathname}?${params.toString()}`)`` on button click.

## Verification
- Run: `npm test`
