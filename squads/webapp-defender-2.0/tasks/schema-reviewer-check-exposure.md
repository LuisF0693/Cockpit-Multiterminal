---
task: checkSchemaExposure()
responsavel: "@schema-reviewer"
responsavel_type: Agent
atomic_layer: Task
elicit: false

Entrada:
  - campo: supabase_url
    tipo: string
    origem: User Input
    obrigatorio: true

Saida:
  - campo: exposure_check
    tipo: object
    destino: Console
    persistido: false

Checklist:
  - "[ ] Check if OpenAPI endpoint is accessible"
  - "[ ] Check if PostgREST hints are enabled"
  - "[ ] Check auth settings endpoint"
  - "[ ] Quantify exposed information"
  - "[ ] Generate restriction recommendations"
---

# Check Schema Exposure

## Purpose

Verify which API metadata endpoints are publicly accessible and what they reveal.

## Endpoints Checked

| Endpoint | Reveals | Severity |
|----------|---------|----------|
| `/rest/v1/` (OpenAPI) | Full schema | MEDIUM-HIGH |
| `/auth/v1/settings` | Auth configuration | LOW-MEDIUM |
| Error responses with hints | Function signatures | MEDIUM |
