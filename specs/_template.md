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
