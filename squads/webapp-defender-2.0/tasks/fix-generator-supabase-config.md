---
task: generateSupabaseConfig()
responsavel: "@fix-generator"
responsavel_type: Agent
atomic_layer: Task
elicit: false

Entrada:
  - campo: findings
    tipo: array
    origem: Auth/config audit findings
    obrigatorio: true

Saida:
  - campo: config_steps
    tipo: string
    destino: Console
    persistido: false

Checklist:
  - "[ ] Generate auth settings changes"
  - "[ ] Generate PostgREST config changes"
  - "[ ] Generate rate limiting config"
  - "[ ] Output step-by-step instructions"
---

# Generate Supabase Configuration Fix

## Purpose

Generate step-by-step Supabase Dashboard configuration changes for auth, PostgREST, and rate limiting findings.

## Output Format

```
SUPABASE CONFIGURATION FIX
═══════════════════════════════════════

1. Authentication > Settings:
   [ ] Disable signup → OFF
   [ ] Enable email confirmations → ON
   [ ] Minimum password length → 12

2. Authentication > Rate Limits:
   [ ] Email sign-in → 5/minute
   [ ] Email sign-up → 3/hour
   [ ] SMS OTP → 3/minute

3. SQL Editor (run as admin):
   ALTER ROLE authenticator SET pgrst.db_plan_enabled TO false;
   NOTIFY pgrst, 'reload config';

4. Settings > Auth:
   [ ] JWT expiry → 3600
```
