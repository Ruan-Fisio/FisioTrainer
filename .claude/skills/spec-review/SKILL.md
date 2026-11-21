---
name: spec-review
description: SDD — revisa specs/NNN-slug.md. Antes da implementação revisa o documento (lacunas, ambiguidade, plano incoerente); depois, confere se o código entregue cumpre cada CA/RN.
argument-hint: <NNN>
disable-model-invocation: true
---

# /spec-review — Revisar a spec

Entrada: `$ARGUMENTS` = `NNN` (vazio → spec mais recente).

Leia `specs/NNN-*.md`. O modo depende do Status:

## Modo documento (`rascunho`/`aprovado`, tarefas pendentes)
Verifique, sem ler código além do que o Plano cita:
- CA vago ou não testável; RN contraditória; caso de borda esquecido (vazio/nulo, virada de mês/ano, fuso, permissão/usuário sem acesso, paciente excluído, mobile).
- Plano que não cobre algum CA/RN, ou arquivo/tarefa sem CA correspondente (escopo extra).
- Violação das regras críticas do CLAUDE.md (datas, lógica pura sem teste, validação só no client, sala/plano, migration destrutiva sem backup).
- Tarefas fora de ordem ou grandes demais.

## Modo implementação (`implementado` ou tarefas `[x]`)
- Para cada CA/RN: aponte onde está implementado e testado (`arquivo:linha`) ou marque **não cumprido**.
- Leia só os arquivos da tabela Arquivos + `git diff` relevante. Não rode build; rode só os testes citados na spec se precisar confirmar.

## Saída
Lista curta, mais grave primeiro: `[bloqueante|ajuste|nit] <problema> → <correção sugerida>`. Termine perguntando se deve aplicar as correções no documento (modo documento) ou no código (modo implementação). Não altere nada sem confirmação.
