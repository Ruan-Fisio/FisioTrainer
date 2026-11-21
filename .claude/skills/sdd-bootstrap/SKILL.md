---
name: sdd-bootstrap
description: Prepara o repositório atual para SDD — cria specs/ (README + template), registra o fluxo no CLAUDE.md e gera um mapa das áreas existentes. Idempotente.
disable-model-invocation: true
---

# /sdd-bootstrap — Preparar o repo para SDD

Idempotente: se algo já existe, só complete o que falta — nunca sobrescreva conteúdo do usuário.

## Passos
1. **Contexto barato**: leia `CLAUDE.md` (se houver), liste `docs/` e a árvore de rotas/módulos no nível 2 (`ls`, sem ler arquivos de código). Sem subagentes.
2. **`specs/README.md`**: fluxo `/spec <descrição>` → `/spec-review NNN` → `/implement NNN` → `/spec-review NNN`; uma feature = um arquivo `specs/NNN-slug.md` (spec + plano + tarefas); regras duráveis vão para `docs/` ao final.
3. **`specs/_template.md`**: copie o bloco "Formato" de `.claude/skills/spec/SKILL.md`.
4. **`specs/000-mapa.md`**: mapa do sistema atual como base para specs futuras — uma linha por área: `Área | rotas/módulos principais | doc de referência`. Só o que já existe; nada inventado. Se não houver docs por área, liste as áreas e sugira (não crie) quais merecem `docs/<área>.md`.
5. **CLAUDE.md**: garanta uma linha no índice apontando para `specs/README.md` com o fluxo. Se não houver CLAUDE.md, sugira rodar `/init` antes.
6. Termine listando os arquivos criados/alterados.
