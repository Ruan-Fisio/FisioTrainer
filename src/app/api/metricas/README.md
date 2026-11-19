# Métricas API (`api/metricas`)

## Overview
Endpoints de coleta das métricas de uso (spec 001, `docs/metricas.md`).

## Interface
- `acesso/route.ts:POST` — recebe `{ p: pathname }`, normaliza com `normalizarRota`, grava via `registrarEvento`. Sempre responde 204.

## Invariants
- Público por desenho (portal/pré-cadastro); a área é derivada do pathname no servidor. CLINICA sem sessão é descartada.
- Body limitado a 1 KB; nunca ecoa dados; nunca lança.
