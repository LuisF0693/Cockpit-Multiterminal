---
task: compareBaseline()
responsavel: "@header-analyzer"
responsavel_type: Agent
atomic_layer: Task
elicit: false

Entrada:
  - campo: current_headers
    tipo: string
    origem: HTTP response headers
    obrigatorio: true
  - campo: baseline
    tipo: string
    origem: Previous scan or standard baseline
    obrigatorio: false

Saida:
  - campo: comparison
    tipo: object
    destino: Console
    persistido: false

Checklist:
  - "[ ] Parse current headers"
  - "[ ] Load baseline (default if not provided)"
  - "[ ] Compare each header"
  - "[ ] Identify regressions"
  - "[ ] Identify improvements"
  - "[ ] Output diff"
---

# Compare Headers Against Baseline

## Purpose

Compare current headers against a previous scan or standard baseline to detect regressions or improvements.

## Default Baseline

If no baseline provided, uses the OWASP recommended headers set. Useful for first-time audits.
