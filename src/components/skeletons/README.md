# Skeletons Components

## Overview
Provides pure presentational React loading placeholder components that render `Card`-wrapped skeleton rows using UI `Card`, `CardContent`, and `Skeleton` primitives.

## Interface
- `[table-skeleton.tsx:TableSkeleton]`: React component accepting `{ rows?: number }` (default `6`); renders a `Card` containing `rows` placeholder rows with circular, text, and action `Skeleton` elements.
- `[usuarios-table-skeleton.tsx:UsuariosTableSkeleton]`: React component taking no props; renders a `Card` containing 6 hardcoded placeholder rows with circular, text, and action `Skeleton` elements.

## Invariants
- None

## Side Effects
- None

## Verification
- Run: `npm test`
