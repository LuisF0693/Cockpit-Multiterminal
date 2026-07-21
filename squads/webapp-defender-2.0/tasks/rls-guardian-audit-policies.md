---
task: auditRlsPolicies()
responsavel: "@rls-guardian"
responsavel_type: Agent
atomic_layer: Task
elicit: false

Entrada:
  - campo: sql_source
    tipo: string
    origem: SQL dump, migration files, or Supabase schema
    obrigatorio: true
    validacao: Valid SQL content

Saida:
  - campo: rls_report
    tipo: object
    destino: Console / Shield
    persistido: false

Checklist:
  - "[ ] Parse SQL for CREATE TABLE statements"
  - "[ ] Check RLS enabled status per table"
  - "[ ] Enumerate existing policies per table"
  - "[ ] Check coverage (SELECT/INSERT/UPDATE/DELETE)"
  - "[ ] Identify anon access policies"
  - "[ ] Flag permissive USING(true) policies"
  - "[ ] Generate findings with fixes"
---

# Audit RLS Policies

## Purpose

Analyze SQL dump or migration files to audit Row Level Security policies across all tables. Identify missing RLS, incomplete coverage, and overly permissive policies.

## Execution

### Step 1: Extract Tables
Parse all `CREATE TABLE` statements from the SQL source. Build inventory of public schema tables.

### Step 2: Check RLS Status
For each table, check for `ALTER TABLE ... ENABLE ROW LEVEL SECURITY`. Tables without this are **CRITICAL**.

### Step 3: Enumerate Policies
For each table with RLS, list all policies and check:
- Which operations are covered (SELECT, INSERT, UPDATE, DELETE)
- Which roles are targeted (anon, authenticated, specific roles)
- What the USING clause restricts
- What the WITH CHECK clause validates

### Step 4: Coverage Matrix
Build matrix: table × operation → policy status

### Step 5: Generate Findings
For each gap, generate a finding with:
- Severity (CRITICAL if no RLS, HIGH if incomplete)
- CVSS score
- OWASP A01 mapping
- NIST AC-3 mapping
- Ready-to-apply SQL fix

## Output Format

```
RLS AUDIT RESULTS
═══════════════════════════════════════
Tables: {total} | RLS Enabled: {count} | Coverage: {percent}%

CRITICAL — No RLS:
  - {table}: 0 policies, all data exposed

HIGH — Incomplete Coverage:
  - {table}: SELECT ✓ | INSERT ✗ | UPDATE ✗ | DELETE ✓

MEDIUM — Permissive Policies:
  - {table}: SELECT uses USING(true) — no restriction

Fixes generated: {count}
```
