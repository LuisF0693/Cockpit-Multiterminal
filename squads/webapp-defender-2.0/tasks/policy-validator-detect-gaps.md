---
task: detectGaps()
responsavel: "@policy-validator"
responsavel_type: Agent
atomic_layer: Task
elicit: false

Entrada:
  - campo: coverage_matrix
    tipo: object
    origem: checkCoverage output
    obrigatorio: true

Saida:
  - campo: gap_report
    tipo: array
    destino: Console / Fix Generator
    persistido: false

Checklist:
  - "[ ] Identify all tables with RLS disabled"
  - "[ ] Identify all missing operation policies"
  - "[ ] Prioritize by PII sensitivity"
  - "[ ] Generate fix requests for Fix Generator"
---

# Detect Policy Gaps

## Purpose

From the coverage matrix, extract all gaps and prioritize them for remediation. Feeds results to Fix Generator for SQL generation.

## Priority Order

1. Tables with PII + no RLS → CRITICAL
2. Tables with PII + partial coverage → HIGH
3. Tables without PII + no RLS → MEDIUM
4. Tables with permissive policies → MEDIUM
5. Missing FORCE ROW LEVEL SECURITY → LOW
