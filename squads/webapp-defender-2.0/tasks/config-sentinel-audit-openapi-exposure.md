---
task: auditOpenApiExposure()
responsavel: "@config-sentinel"
responsavel_type: Agent
atomic_layer: Task
elicit: false

Entrada:
  - campo: openapi_schema
    tipo: string
    origem: OpenAPI JSON or endpoint URL
    obrigatorio: true

Saida:
  - campo: exposure_findings
    tipo: array
    destino: Console / Shield
    persistido: false

Checklist:
  - "[ ] Count exposed tables/definitions"
  - "[ ] Count exposed paths/endpoints"
  - "[ ] Identify PII-related tables in schema"
  - "[ ] Identify destructive RPCs in schema"
  - "[ ] Assess information disclosure severity"
  - "[ ] Generate restriction recommendations"
---

# Audit OpenAPI Schema Exposure

## Purpose

Analyze the publicly accessible OpenAPI schema to assess information disclosure. Schema reveals table names, column types, RPC signatures — a roadmap for attackers.

## Metrics

| Metric | Low Risk | Medium Risk | High Risk |
|--------|----------|-------------|-----------|
| Tables exposed | < 5 | 5-20 | > 20 |
| RPCs exposed | < 3 | 3-10 | > 10 |
| PII tables visible | 0 | 1-3 | > 3 |
| Destructive RPCs visible | 0 | 1 | > 1 |

## Fix Options

1. **Server-side proxy** — Vercel serverless functions relay API calls (hides schema completely)
2. **PostgREST schema restriction** — Limit exposed schemas
3. **API gateway** — Rate limit and restrict schema endpoint access
