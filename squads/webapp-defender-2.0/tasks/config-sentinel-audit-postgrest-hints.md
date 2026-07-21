---
task: auditPostgrestHints()
responsavel: "@config-sentinel"
responsavel_type: Agent
atomic_layer: Task
elicit: false

Entrada:
  - campo: api_responses
    tipo: string
    origem: API error responses or config
    obrigatorio: true

Saida:
  - campo: hints_findings
    tipo: array
    destino: Console / Shield
    persistido: false

Checklist:
  - "[ ] Check for hint/details fields in error responses"
  - "[ ] Count functions with exposed signatures"
  - "[ ] Assess information disclosure level"
  - "[ ] Generate disable config"
---

# Audit PostgREST Hints

## Purpose

Check if PostgREST hints are enabled, revealing function signatures and internal details in error messages.

## Detection

If API error responses contain `hint` or `details` fields with function signatures:
```json
{ "hint": "If a new function was created...", "details": "Searched for public.func_name..." }
```
→ Hints are ENABLED → Information disclosure

## Fix

```sql
ALTER ROLE authenticator SET pgrst.db_plan_enabled TO false;
NOTIFY pgrst, 'reload config';
```
