---
task: checkTableExposure()
responsavel: "@rls-guardian"
responsavel_type: Agent
atomic_layer: Task
elicit: false

Entrada:
  - campo: schema_info
    tipo: string
    origem: OpenAPI schema, SQL dump, or table list
    obrigatorio: true

Saida:
  - campo: exposure_report
    tipo: object
    destino: Console / Shield
    persistido: false

Checklist:
  - "[ ] List all public tables"
  - "[ ] Classify tables by sensitivity (PII, admin, operational)"
  - "[ ] Check which tables are accessible via REST API"
  - "[ ] Identify PII columns (name, email, phone, address)"
  - "[ ] Flag tables accessible to anon role"
  - "[ ] Generate exposure risk assessment"
---

# Check Table Exposure

## Purpose

Identify which tables contain PII or sensitive data and assess their exposure level through the REST API.

## PII Column Detection

| Pattern | Type | Sensitivity |
|---------|------|-------------|
| `*name*`, `*nome*` | Name | HIGH |
| `*email*` | Email | HIGH |
| `*phone*`, `*telefone*` | Phone | HIGH |
| `*address*`, `*endereco*`, `*bairro*` | Address | HIGH |
| `*cpf*`, `*rg*`, `*document*` | Government ID | CRITICAL |
| `*password*`, `*senha*`, `*hash*` | Credential | CRITICAL |
| `*token*`, `*secret*`, `*key*` | Secret | CRITICAL |
| `*profile*`, `*perfil*` | Profile data | MEDIUM |

## Output

For each table: name, row count estimate, PII columns found, RLS status, anon access, risk level.
