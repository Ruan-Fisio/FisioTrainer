# NextAuth Route Handler (`[...nextauth]`)

## Overview
Catch-all Next.js App Router API endpoint delegating all NextAuth authentication requests directly to the centralized handlers configured in `@/lib/auth`.

## Interface
- `[route.ts:GET]` — Exported HTTP `GET` handler destructured and re-exported from `handlers` (`@/lib/auth`).
- `[route.ts:POST]` — Exported HTTP `POST` handler destructured and re-exported from `handlers` (`@/lib/auth`).
- `[route.ts:handlers]` — Re-export source from `@/lib/auth`; no local route segment config exports (`runtime`, `dynamic`) or parameter handling exist in this file.

## Invariants
- None

## Side Effects
- `[route.ts:handlers]` Delegates `GET` and `POST` request processing and auth lifecycle behavior to NextAuth handlers imported from `@/lib/auth`.

## Verification
- Run: `npm test`
