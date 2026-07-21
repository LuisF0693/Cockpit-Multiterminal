---
task: generateSchemaFix()
responsavel: "@schema-reviewer"
responsavel_type: Agent
atomic_layer: Task
elicit: false

Entrada:
  - campo: exposure_findings
    tipo: array
    origem: Schema analysis results
    obrigatorio: true

Saida:
  - campo: fix_config
    tipo: string
    destino: Console / File
    persistido: true

Checklist:
  - "[ ] Generate PostgREST hint disable SQL"
  - "[ ] Generate API proxy recommendation"
  - "[ ] Generate schema restriction config"
---

# Generate Schema Restriction Fix

## Purpose

Generate configurations to restrict API schema exposure.

## Fixes

### Disable PostgREST Hints
```sql
ALTER ROLE authenticator SET pgrst.db_plan_enabled TO false;
NOTIFY pgrst, 'reload config';
```

### Server-Side Proxy (Vercel)
Recommend moving API calls through Vercel serverless functions to hide Supabase URL and schema from client.

### Restrict Schema Access
Configure API gateway or proxy to block OpenAPI schema endpoint for unauthenticated requests.
