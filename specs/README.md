# Specs (SDD)

Fluxo: `/spec <descrição>` → `/spec-review NNN` → `/implement NNN` → `/spec-review NNN`.

- Uma feature = um arquivo `specs/NNN-slug.md` com **Spec** (o quê/porquê), **Plano** (como) e **Tarefas** (checklist).
- `/spec-review` antes de implementar revisa o documento; depois, confere o código contra os critérios de aceite.
- Ao final da implementação, as regras duráveis vão para `docs/<área>.md`; o arquivo da spec fica como histórico.
- Molde: `_template.md`. Mapa das áreas existentes: `000-mapa.md` (gerado por `/sdd-bootstrap`).
