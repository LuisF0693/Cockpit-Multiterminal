---
task: validateRpcAuth()
responsavel: "@rls-guardian"
responsavel_type: Agent
atomic_layer: Task
elicit: false

Entrada:
  - campo: sql_source
    tipo: string
    origem: SQL dump or function definitions
    obrigatorio: true

Saida:
  - campo: rpc_audit
    tipo: object
    destino: Console / Shield
    persistido: false

Checklist:
  - "[ ] Extract all CREATE FUNCTION statements"
  - "[ ] Check for SECURITY DEFINER functions"
  - "[ ] Verify auth.uid() check exists"
  - "[ ] Verify role check for privileged operations"
  - "[ ] Flag destructive functions without auth"
  - "[ ] Generate findings with fix templates"
---

# Validate RPC Authorization

## Purpose

Audit all PostgreSQL RPC functions for proper authorization checks. Functions with `SECURITY DEFINER` that lack auth validation are critical vulnerabilities.

## Risk Classification

| Function Type | Required Auth | Example |
|-------------|---------------|---------|
| Read own data | `auth.uid()` check | `get_my_profile()` |
| Read all data | Role check (admin) | `get_all_users()` |
| Write own data | `auth.uid()` + ownership | `update_my_profile()` |
| Write any data | Role check (admin) | `grant_role()` |
| Delete data | Role check (admin/owner) | `delete_user()` |
| System operation | Role check (owner only) | `reset_database()` |

## Detection Rules

1. **SECURITY DEFINER without auth.uid()** → CRITICAL
2. **DELETE/DROP operations without role check** → CRITICAL
3. **INSERT into auth.* without admin check** → CRITICAL
4. **No error handling on auth failure** → HIGH
5. **Accepts user_id as parameter without validation** → HIGH (IDOR risk)
