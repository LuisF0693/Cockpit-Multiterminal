---
task: auditSecurityHeaders()
responsavel: "@config-sentinel"
responsavel_type: Agent
atomic_layer: Task
elicit: false

Entrada:
  - campo: response_headers
    tipo: string
    origem: HTTP response headers or config file
    obrigatorio: true

Saida:
  - campo: header_findings
    tipo: array
    destino: Console / Shield
    persistido: false

Checklist:
  - "[ ] Check HSTS presence and config"
  - "[ ] Check X-Content-Type-Options"
  - "[ ] Check X-Frame-Options"
  - "[ ] Check CSP (analyze directives)"
  - "[ ] Check Referrer-Policy"
  - "[ ] Check Permissions-Policy"
  - "[ ] Check for information disclosure headers"
  - "[ ] Score and generate fixes"
---

# Audit Security Headers

## Purpose

Analyze HTTP response headers against security best practices. Generate findings for missing or misconfigured headers.

## Required Headers

| Header | Required Value | Severity if Missing |
|--------|---------------|-------------------|
| Strict-Transport-Security | `max-age=31536000; includeSubDomains; preload` | HIGH |
| X-Content-Type-Options | `nosniff` | MEDIUM |
| X-Frame-Options | `DENY` | MEDIUM |
| Content-Security-Policy | No unsafe-eval, minimal unsafe-inline | HIGH |
| Referrer-Policy | `strict-origin-when-cross-origin` | LOW |
| Permissions-Policy | Restrict unused features | LOW |

## CSP Deep Analysis

Flag these CSP directives:
- `unsafe-eval` → HIGH (XSS via eval)
- `unsafe-inline` in script-src → MEDIUM
- `*` wildcard → MEDIUM
- `data:` in script-src → MEDIUM
- Missing `frame-ancestors` → MEDIUM
- Missing `base-uri` → LOW
