---
task: checkSignupConfig()
responsavel: "@auth-inspector"
responsavel_type: Agent
atomic_layer: Task
elicit: false

Entrada:
  - campo: auth_settings
    tipo: string
    origem: Supabase auth settings
    obrigatorio: true

Saida:
  - campo: signup_findings
    tipo: array
    destino: Console / Shield
    persistido: false

Checklist:
  - "[ ] Check if signup is open or restricted"
  - "[ ] Check email confirmation setting"
  - "[ ] Check allowed email domains"
  - "[ ] Check if auto-confirm is enabled"
  - "[ ] Assess risk level"
  - "[ ] Generate fix"
---

# Check Signup Configuration

## Purpose

Verify signup settings are appropriately restrictive. Open signup with auto-confirm was found in multiple audited apps.

## Risk Matrix

| Signup Open | Auto-Confirm | Risk |
|-------------|-------------|------|
| Yes | Yes | **HIGH** — Anyone creates verified accounts instantly |
| Yes | No | MEDIUM — Accounts created but unverified |
| No (invite) | N/A | LOW — Only invited users |

## Fix

```
Supabase Dashboard > Authentication > Settings:
  ✗ "Allow new users to sign up" → OFF
  ✓ "Enable email confirmations" → ON
```
