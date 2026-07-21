---
task: checkPasswordPolicy()
responsavel: "@auth-inspector"
responsavel_type: Agent
atomic_layer: Task
elicit: false

Entrada:
  - campo: auth_settings
    tipo: string
    origem: Supabase settings or app config
    obrigatorio: true

Saida:
  - campo: password_findings
    tipo: array
    destino: Console / Shield
    persistido: false

Checklist:
  - "[ ] Check minimum password length"
  - "[ ] Check complexity requirements"
  - "[ ] Check against common passwords list"
  - "[ ] Assess policy strength"
  - "[ ] Generate recommendations"
---

# Check Password Policy

## Purpose

Evaluate password policy strength. Default Supabase minimum is 6 characters — insufficient for production.

## Recommended Policy

| Setting | Minimum | Recommended |
|---------|---------|-------------|
| Length | 8 | 12+ |
| Uppercase | 1 | Required |
| Lowercase | 1 | Required |
| Numbers | 1 | Required |
| Special chars | 0 | Recommended |

## Fix

```
Supabase Dashboard > Authentication > Settings:
  Minimum password length: 12
```

For frontend enforcement, add client-side validation matching server policy.
