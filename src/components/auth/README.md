# auth

## Overview
Authentication UI component package containing the client-side email/password login form wired to the Next.js authentication server action (`@/actions/auth`).

## Interface
- `[login-form.tsx:LoginForm]` — Client Component (`"use client"`) taking no props; renders a Card with an email/password `<form>` bound to `loginAction`, conditional error feedback, and an internal `SubmitButton` tracking form submission status.

## Invariants
- `[login-form.tsx:LoginForm]` — Runs as a Client Component (`"use client"`) using `useActionState` and `useFormStatus`; form action state initializes via `[login-form.tsx:initialState]` as `{}`.
- `[login-form.tsx:LoginForm]` — Both `email` (`type="email"`, `name="email"`, `autoComplete="email"`) and `password` (`type="password"`, `name="password"`, `autoComplete="current-password"`) inputs are marked `required`.
- `[login-form.tsx:LoginForm]` — Error feedback `<p>` renders only when `state.error` is truthy.
- `[login-form.tsx:SubmitButton]` — Must remain inside the `<form>` tree to read `useFormStatus()`; disables submission while `pending` is true and toggles its label between `"Entrando..."` and `"Entrar"`.

## Side Effects
- `[login-form.tsx:LoginForm]` — Submitting the form invokes the `loginAction` server action (`@/actions/auth`) via `useActionState(loginAction, initialState)` and updates component state with the returned `LoginState`.

## Verification
- Run: `npm test`
