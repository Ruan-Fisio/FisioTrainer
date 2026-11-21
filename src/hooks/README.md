# React Hooks (`src/hooks`)

## Overview

Provides reusable custom React hooks for client-side component behavior. Currently exports `useDebouncedCallback` (`use-debounced-callback.ts`) to delay and coalesce repeated callback invocations using a ref-tracked timeout cleared on re-invocation and component unmount.

## Interface

- `[use-debounced-callback.ts:useDebouncedCallback]` — Exported generic hook `useDebouncedCallback<Args extends unknown[]>(callback: (...args: Args) => void, delay: number)` returning a memoized `(...args: Args) => void` function (inferred from `useCallback`; no `"use client"` directive present in file).

## Invariants

- `[use-debounced-callback.ts:timeoutRef]` — Initialized via `useRef<ReturnType<typeof setTimeout> | undefined>(undefined)`.
- `[use-debounced-callback.ts:useCallback]` — Calls `clearTimeout(timeoutRef.current)` immediately before scheduling a new `setTimeout`, guaranteeing at most one pending timer handle in `timeoutRef.current` per hook instance.
- `[use-debounced-callback.ts:useCallback]` — Memoizes the returned wrapper with dependency array `[callback, delay]` (does not store `callback` in a ref).
- `[use-debounced-callback.ts:useEffect]` — Registers an unmount cleanup effect (`[]` dependency array) that calls `clearTimeout(timeoutRef.current)` so pending timers do not fire after unmount.

## Side Effects

- `[use-debounced-callback.ts:useEffect]` — Registers a mount/unmount React effect whose cleanup calls `clearTimeout(timeoutRef.current)`.
- `[use-debounced-callback.ts:useCallback]` — Calling the returned function cancels any active timer via `clearTimeout(timeoutRef.current)`, schedules a new timer via `setTimeout(() => callback(...args), delay)`, and mutates `timeoutRef.current`.
- `[use-debounced-callback.ts:setTimeout]` — Asynchronously invokes the caller-supplied `callback(...args)` after `delay` milliseconds unless superseded or cleared on unmount.

## Verification

- Run: `npm test`
