---
task: checkCoverage()
responsavel: "@policy-validator"
responsavel_type: Agent
atomic_layer: Task
elicit: false

Entrada:
  - campo: policy_data
    tipo: object
    origem: validateRls output or SQL
    obrigatorio: true

Saida:
  - campo: coverage_matrix
    tipo: object
    destino: Console
    persistido: false

Checklist:
  - "[ ] Build table × operation matrix"
  - "[ ] Calculate coverage percentage"
  - "[ ] Identify gaps"
  - "[ ] Output visual matrix"
---

# Check Policy Coverage

## Purpose

Generate a coverage matrix showing which tables have policies for which operations.

## Output

```
POLICY COVERAGE MATRIX
═══════════════════════════════════════
Table                | RLS | SEL | INS | UPD | DEL | Score
─────────────────────┼─────┼─────┼─────┼─────┼─────┼──────
voluntarios          |  ✗  |  ✗  |  ✗  |  ✗  |  ✗  | 0/5
user_profiles        |  ✓  |  ✓  |  ✓  |  ✓  |  ✓  | 5/5
quiz_rankings        |  ✓  |  ✓  |  ✗  |  ✗  |  ✓  | 3/5
user_achievements    |  ✓  |  ✓  |  ✗  |  ✗  |  ✗  | 2/5
─────────────────────┴─────┴─────┴─────┴─────┴─────┴──────
Overall coverage: 42% — FAIL (target: 100%)
```
