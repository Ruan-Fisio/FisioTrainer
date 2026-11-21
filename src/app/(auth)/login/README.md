# Login Page

## Overview
Public authentication entry point under the `(auth)` route group that displays the FisioTrainer logo and renders the interactive login form inside a centered vertical layout.

## Interface
- `[page.tsx:LoginPage]` — Default export React server component `LoginPage()` accepting no props, with no `metadata`/`generateMetadata` or route segment config exports.

## Invariants
- None

## Side Effects
- `[page.tsx:LoginPage]` Renders the static `/logo.png` asset via `next/image` (`<Image src="/logo.png" alt="FisioTrainer" width={523} height={342} priority />`).
- `[page.tsx:LoginPage]` Mounts `<LoginForm />` from `@/components/auth/login-form`.

## Verification
- Run: `npm test`
