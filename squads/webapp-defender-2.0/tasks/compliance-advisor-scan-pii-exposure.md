---
task: scanPiiExposure()
responsavel: "@compliance-advisor"
responsavel_type: Agent
atomic_layer: Task
elicit: false

Entrada:
  - campo: schema_or_data
    tipo: string
    origem: SQL schema, OpenAPI, or table descriptions
    obrigatorio: true

Saida:
  - campo: pii_report
    tipo: object
    destino: Console / Shield
    persistido: false

Checklist:
  - "[ ] Scan table/column names for PII patterns"
  - "[ ] Classify PII by sensitivity level"
  - "[ ] Count affected data subjects"
  - "[ ] Check protection mechanisms (RLS, encryption)"
  - "[ ] Assess exposure risk"
  - "[ ] Map to LGPD articles"
---

# Scan PII Exposure

## Purpose

Identify personal data exposure by analyzing database schema, API responses, or table descriptions. Maps findings to LGPD requirements.

## PII Detection Patterns

| Column Pattern | PII Type | LGPD Category | Sensitivity |
|---------------|----------|---------------|-------------|
| `*nome*`, `*name*` | Nome completo | Identificacao | HIGH |
| `*email*` | Email | Contato | HIGH |
| `*telefone*`, `*phone*` | Telefone | Contato | HIGH |
| `*endereco*`, `*address*`, `*bairro*` | Endereco | Localizacao | HIGH |
| `*cpf*`, `*rg*` | Documento | Identificacao | CRITICAL |
| `*cognitive*`, `*disc*`, `*enneagram*` | Perfil psicometrico | Dado sensivel (Art. 11) | CRITICAL |
| `*saude*`, `*health*` | Dado de saude | Dado sensivel (Art. 11) | CRITICAL |

## Output

```
PII EXPOSURE REPORT
═══════════════════════════════════════
Tables with PII: X/Y
Data subjects affected: ~Z people
Sensitive data found: {yes/no}

Table: voluntarios (73 records)
  - nome (text) → Nome completo [HIGH]
  - telefone (text) → Telefone [HIGH]
  - bairro (text) → Localizacao [MEDIUM]
  Protection: RLS DISABLED → CRITICAL EXPOSURE

LGPD Violations:
  - Art. 6, VII (Seguranca) — Medidas tecnicas insuficientes
  - Art. 46 — Ausencia de protecao adequada
```
