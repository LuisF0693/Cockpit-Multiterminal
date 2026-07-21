---
task: analyzeHeaders()
responsavel: "@header-analyzer"
responsavel_type: Agent
atomic_layer: Task
elicit: false

Entrada:
  - campo: headers
    tipo: string
    origem: HTTP response headers (pasted or from curl)
    obrigatorio: true

Saida:
  - campo: header_report
    tipo: object
    destino: Console / Config Sentinel
    persistido: false

Checklist:
  - "[ ] Parse response headers"
  - "[ ] Check each required security header"
  - "[ ] Deep-analyze CSP directives"
  - "[ ] Check for info disclosure headers"
  - "[ ] Score (pass/fail per header)"
  - "[ ] Generate fix config"
---

# Analyze HTTP Headers

## Purpose

Parse and evaluate HTTP response headers against security baseline. Output pass/fail for each header with fix recommendations.

## Output Format

```
HEADER ANALYSIS
═══════════════════════════════════════
✓ PASS  HSTS: max-age=31536000; includeSubDomains; preload
✗ FAIL  X-Content-Type-Options: MISSING
✗ FAIL  X-Frame-Options: MISSING
⚠ WARN  CSP: contains 'unsafe-inline'
✓ PASS  Referrer-Policy: strict-origin-when-cross-origin
✗ FAIL  Permissions-Policy: MISSING

Score: 2/6 headers present, 1 warning
Overall: MEDIUM risk
```
