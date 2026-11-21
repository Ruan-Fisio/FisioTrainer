---
name: implement
description: SDD — implementa o que está escrito em specs/NNN-slug.md, seguindo o checklist de Tarefas e marcando o progresso.
argument-hint: <NNN> [Tn | Tn-Tm]
disable-model-invocation: true
---

# /implement — Implementar a spec

Entrada: `$ARGUMENTS` = `NNN` e opcionalmente tarefa(s) (`T3`, `T3-T6`). Sem filtro → todas as pendentes, em ordem. Sem `NNN` → spec mais recente com tarefas `[ ]`.

## Passos
1. Leia `specs/NNN-*.md` (uma vez). Se tiver `[DÚVIDA]` aberta, pergunte antes de começar. Marque `Status: aprovado` se estava `rascunho`.
2. Para cada tarefa alvo: leia só os arquivos que ela toca, implemente, rode o teste afetado (`npx vitest run <arquivo>`) e marque `[x]` no documento na hora.
3. Desvio do plano (algo que muda a abordagem) → pare, ajuste a seção Plano/Tarefas com o motivo em 1 linha e avise o usuário antes de seguir.
4. Na verificação final rode `npm test`, `npx tsc --noEmit`, `npx next build`. Nunca `.skip`/apague teste para passar.
5. Tarefa de docs: leve ao `docs/<área>.md` só regras duráveis (RN, invariantes) — não histórico. Área nova → crie o doc + 1 linha no índice do CLAUDE.md.
6. Tudo `[x]` → `Status: implementado`.
7. Termine com: feito (2–4 linhas), resultado dos testes, pendências. Não faça commit sem o usuário pedir.

Regras: não implemente nada fora das Tarefas; siga as regras críticas do CLAUDE.md; sem subagentes.
