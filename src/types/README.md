# Type Declarations (`src/types`)

## Overview

Holds ambient TypeScript module augmentation declarations for third-party packages. Currently contains `next-auth.d.ts`, which augments the `next-auth` `Session` interface and `next-auth/jwt` `JWT` interface with required string `id` fields for authenticated user identity propagation.

## Interface

- `[next-auth.d.ts:DefaultSession]` — Type-only import of `DefaultSession` from `"next-auth"`.
- `[next-auth.d.ts:declare module "next-auth"]` — Module augmentation for `"next-auth"` extending `[next-auth.d.ts:Session]` with `[next-auth.d.ts:Session.user]` typed as `{ id: string } & DefaultSession["user"]`.
- `[next-auth.d.ts:declare module "next-auth/jwt"]` — Module augmentation for `"next-auth/jwt"` extending `[next-auth.d.ts:JWT]` with `[next-auth.d.ts:JWT.id]` typed as `string`.

## Invariants

- `[next-auth.d.ts:Session.user]` — Declares `Session.user` as non-optional with type `{ id: string } & DefaultSession["user"]`, requiring a non-optional `id: string` alongside `DefaultSession["user"]`.
- `[next-auth.d.ts:JWT.id]` — Declares `JWT.id` as a non-optional `string` property.

## Side Effects

- None

## Verification

- Run: `npm test`
