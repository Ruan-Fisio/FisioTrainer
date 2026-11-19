# Metrics Route (`metrics`)

## Overview
Painel interno de métricas de uso (spec 001, `docs/metricas.md`). Sem link no menu; só usuário logado (proxy). `robots: noindex`.

## Interface
- `page.tsx:MetricsPage` — lê `?dias=` (`parsePeriodo`), renderiza blocos em `Suspense` e agenda a purga (`after`).
- `loading.tsx:Loading` — esqueleto da rota.

## Invariants
- Período só 7/30/90/365 (default 30); a URL é a fonte da verdade.
- Em 365 dias, usuários ativos e horário de pico mostram aviso (só 90 dias de brutos).

## Side Effects
- `purgarAntigos()` em `after()` apaga `EventoUso` com >90 dias.
