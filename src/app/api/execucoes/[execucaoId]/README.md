# [execucaoId]

## Overview
Dynamic exam execution resource namespace under `/api/execucoes/[execucaoId]` grouping PDF report endpoints.

## Subdirectories & Boundaries
- `comparacao-rapida-pdf`: [./comparacao-rapida-pdf/README.md](./comparacao-rapida-pdf/README.md) - Authenticated `GET` handler rendering a multi-execution numeric comparison PDF filtered by `execucoes` and optional `campos` query parameters.
- `relatorio`: [./relatorio/README.md](./relatorio/README.md) - Authenticated `GET` handler rendering a comparative evaluation report PDF between `execucaoId` and query parameter `retornoId`.
