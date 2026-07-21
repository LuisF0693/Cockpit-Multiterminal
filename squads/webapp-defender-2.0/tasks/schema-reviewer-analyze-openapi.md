---
task: analyzeOpenapi()
responsavel: "@schema-reviewer"
responsavel_type: Agent
atomic_layer: Task
elicit: false

Entrada:
  - campo: openapi_json
    tipo: string
    origem: OpenAPI schema JSON
    obrigatorio: true

Saida:
  - campo: schema_analysis
    tipo: object
    destino: Console / Config Sentinel
    persistido: false

Checklist:
  - "[ ] Count definitions/tables"
  - "[ ] Count paths/endpoints"
  - "[ ] Identify PII tables"
  - "[ ] Identify destructive operations"
  - "[ ] List exposed RPCs with signatures"
  - "[ ] Assess exposure severity"
---

# Analyze OpenAPI Schema

## Purpose

Deep analysis of an OpenAPI schema to quantify information disclosure and identify high-risk exposures.

## Metrics Extracted

- Total tables/definitions exposed
- Total paths/endpoints
- PII-related tables (name, email, phone patterns)
- Destructive RPCs (delete, drop, remove patterns)
- Admin-only tables visible to public
- Function parameter types revealed
