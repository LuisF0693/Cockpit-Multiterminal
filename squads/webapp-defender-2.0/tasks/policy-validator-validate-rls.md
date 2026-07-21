---
task: validateRls()
responsavel: "@policy-validator"
responsavel_type: Agent
atomic_layer: Task
elicit: false

Entrada:
  - campo: sql_dump
    tipo: string
    origem: SQL file with table and policy definitions
    obrigatorio: true

Saida:
  - campo: validation_result
    tipo: object
    destino: Console / RLS Guardian
    persistido: false

Checklist:
  - "[ ] Parse CREATE TABLE statements"
  - "[ ] Parse ALTER TABLE ... ENABLE ROW LEVEL SECURITY"
  - "[ ] Parse CREATE POLICY statements"
  - "[ ] Build coverage matrix (table × operation)"
  - "[ ] Flag tables without RLS"
  - "[ ] Flag operations without policies"
  - "[ ] Output validation report"
---

# Validate RLS Policies

## Purpose

Parse SQL and validate that every table has RLS enabled with complete policy coverage for all operations (SELECT, INSERT, UPDATE, DELETE).

## Validation Rules

| Rule ID | Check | Severity |
|---------|-------|----------|
| RLS-001 | Table has RLS enabled | CRITICAL if missing |
| RLS-002 | SELECT policy exists | CRITICAL if missing |
| RLS-003 | INSERT policy exists | HIGH if missing |
| RLS-004 | UPDATE policy exists | HIGH if missing |
| RLS-005 | DELETE policy exists | HIGH if missing |
| RLS-006 | No USING(true) on sensitive tables | MEDIUM |
| RLS-007 | Anon role restricted | HIGH if unrestricted |
| RLS-008 | FORCE ROW LEVEL SECURITY set | MEDIUM if missing |
