---
name: spec
description: SDD — escreve num único documento a especificação (o quê/porquê) e o plano de implementação (como + checklist) de uma feature, em specs/NNN-slug.md.
argument-hint: <descrição da feature>
disable-model-invocation: true
---

# /spec — Spec + plano

Entrada: `$ARGUMENTS` (descrição da feature).

## Passos
1. Número: `ls specs/` → `NNN` = maior + 1 (3 dígitos). Slug curto kebab-case. Arquivo: `specs/NNN-slug.md` (molde em `specs/_template.md`).
2. Leia **só** o(s) `docs/<área>.md` que a feature toca (índice no CLAUDE.md) e `docs/fuso-horario.md` se houver datas.
3. Escreva a parte **Spec** primeiro. Ambiguidade que muda comportamento → `[DÚVIDA: ...]`. Se houver dúvidas, pergunte ao usuário (AskUserQuestion, até 4 de uma vez) e resolva antes de planejar. Não pergunte o que tem default óbvio.
4. Investigue o código **de forma direcionada** (Grep/Read só nos arquivos que vão mudar; sem subagentes, sem varredura ampla) e escreva a parte **Plano**.
5. Seja enxuto: frases curtas, sem enchimento, sem repetir regras do CLAUDE.md. Nada de código de implementação — só assinaturas quando ajudar.
6. Termine com 1 linha: caminho + sugestão `/spec-review NNN` ou `/implement NNN`.

## Formato
```markdown
# NNN — <Título>
Status: rascunho | aprovado | implementado

## Spec
### Problema
<1–3 frases>
### Critérios de aceite
- **CA1** Dado <contexto>, quando <ação>, então <resultado observável>.
### Regras de negócio
- **RN1** ...
### Fora de escopo
- ...

## Plano
### Abordagem
<3–6 linhas>
### Dados
<schema Prisma/migration (destrutiva → backup, docs/ops.md), MODULO_LABEL se model novo. Ou "Nenhuma".>
### Arquivos
| Arquivo | Mudança | Cobre |
|---|---|---|
### Testes
- Unit: `src/lib/x.test.ts` — casos ... (CA1, RN1)
- E2E: `e2e/tests/x.spec.ts` — fluxo ... (CA2)
### Riscos
- ...

## Tarefas
- [ ] T1 <verbo + o quê> — `arquivo` (CA1)
- [ ] ...
- [ ] Tn Verificar: `npm test`, `npx tsc --noEmit`, `npx next build`
- [ ] Tn+1 Atualizar `docs/<área>.md` com as regras duráveis
```

Regras do plano: ordem schema → lib pura + teste → actions → UI → E2E → docs; teste junto ou antes do código que cobre; cada tarefa cabe num commit pequeno; todo CA é coberto por algum teste.
