---
task: reviewJwtConfig()
responsavel: "@auth-inspector"
responsavel_type: Agent
atomic_layer: Task
elicit: false

Entrada:
  - campo: jwt_config
    tipo: string
    origem: Supabase settings, JWT sample, or config
    obrigatorio: true

Saida:
  - campo: jwt_findings
    tipo: array
    destino: Console / Shield
    persistido: false

Checklist:
  - "[ ] Check JWT expiry time"
  - "[ ] Check anon key expiry"
  - "[ ] Check refresh token configuration"
  - "[ ] Check for PII in JWT payload"
  - "[ ] Check algorithm strength"
  - "[ ] Generate recommendations"
---

# Review JWT Configuration

## Purpose

Audit JWT settings for security issues. Anon JWT with ~10 year expiry was found in production.

## Checks

| Setting | Secure | Insecure |
|---------|--------|----------|
| Access token expiry | <= 1 hour | > 24 hours |
| Anon key expiry | <= 1 year | ~10 years |
| Refresh token rotation | Enabled | Disabled |
| PII in payload | Only user_id, role | Email, name, phone |
| Algorithm | HS256+ | None/weak |

## Anon Key Risk

The Supabase anon key is PUBLIC. Its risk depends entirely on RLS:
- RLS enabled + proper policies = anon key is safe
- RLS disabled = anon key = full database access
