# Layout Components

## Overview
Provides application layout shell components, including the desktop sidebar, mobile navigation sheet, static route configuration, route-aware collapsible navigation links, user menu with server-action sign-out, and a global wheel-event guard for focused numeric inputs.

## Interface
- `[mobile-nav.tsx:MobileNav]`: Client component (`"use client"`) taking no props; renders a mobile-only trigger button and left-side `Sheet` containing the logo and `<NavLinks />`.
- `[nav-items.ts:NavLeaf]`: Type `{ title: string; href: string }`.
- `[nav-items.ts:NavItem]`: Union type `({ title: string; icon: LucideIcon } & NavLeaf) | { title: string; icon: LucideIcon; items: NavLeaf[] }`.
- `[nav-items.ts:navItems]`: Constant `NavItem[]` defining 16 top-level navigation entries (`/dashboard`, `/curadoria`, `/pacientes`, `/planos`, `/contratos`, `/servicos`, `/cobrancas`, `/agenda`, `/exames`, `/evolucoes`, `/treinos`, group `"Biblioteca de Exercícios"`, group `"Biblioteca de Movimento"`, `/usuarios`, `/configuracoes`, `/logs`).
- `[nav-links.tsx:NavLinks]`: Client component (`"use client"`) accepting `{ onNavigate?: () => void }`; renders `navItems` as `next/link` links or collapsible `NavGroup` sections.
- `[number-input-wheel-guard.tsx:NumberInputWheelGuard]`: Client component (`"use client"`) taking no props and returning `null`; installs a document-level wheel listener to blur focused numeric inputs.
- `[sidebar.tsx:Sidebar]`: Server component taking no props; renders the desktop `<aside>` navigation sidebar with `/logo-sidebar.png` and `<NavLinks />`.
- `[user-menu.tsx:UserMenu]`: Server component accepting `{ name: string; email: string }`; renders an avatar/name dropdown menu displaying user details and a sign-out form.

## Invariants
- `[mobile-nav.tsx:MobileNav]`: Sheet open state initializes to `false` and closes via `<NavLinks onNavigate={() => setOpen(false)} />`; trigger button is hidden at `md` and above (`md:hidden`).
- `[nav-items.ts:navItems]`: Navigation entries are static with no role- or permission-based filtering in this module; each item is either a leaf (`href`) or a nested group (`items`).
- `[nav-links.tsx:NavLinks]`: Distinguishes leaves from groups via `"href" in item` and marks links active using prefix matching (`pathname.startsWith(item.href)`).
- `[nav-links.tsx:NavGroup]`: Marks groups active when `items.some((leaf) => pathname.startsWith(leaf.href))` and initializes collapsible open state once from `isGroupActive`.
- `[number-input-wheel-guard.tsx:NumberInputWheelGuard]`: Blurs `event.target` only when `alvo instanceof HTMLInputElement && alvo.type === "number" && alvo === document.activeElement`; registers with `{ capture: true, passive: true }`.
- `[sidebar.tsx:Sidebar]`: Desktop `<aside>` is hidden below `md` (`hidden ... md:flex`) with fixed width `w-64`.
- `[user-menu.tsx:getInitials]`: Derives up to 2 uppercase avatar initials by splitting `name` on `" "`, filtering empty tokens, taking the first 2, and uppercasing each token's first character.

## Side Effects
- `[nav-links.tsx:NavLinks]`: Reads active route via `usePathname()` (`next/navigation`) and triggers client navigation via `next/link`.
- `[number-input-wheel-guard.tsx:NumberInputWheelGuard]`: Registers/removes a global `document` `"wheel"` capture listener in `useEffect`, reads `document.activeElement`, and calls `alvo.blur()` on focused `<input type="number">` elements.
- `[user-menu.tsx:UserMenu]`: Submits an inline Server Action (`"use server"`) calling `await signOut({ redirectTo: "/login" })` (`@/lib/auth`) to terminate the session and redirect to `/login`.

## Verification
- Run: `npm test`
