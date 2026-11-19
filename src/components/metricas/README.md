# Métricas components (`components/metricas`)

## Overview
UI do painel `/metrics` e o beacon de coleta (spec 001, `docs/metricas.md`).

## Interface
- `rastreador-acesso.tsx:RastreadorAcesso` — client; POST do pathname em `/api/metricas/acesso` a cada mudança de rota.

## Invariants
- Só o pathname sai do navegador; sem query string, sem token. Falha em silêncio.
