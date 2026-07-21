---
task: triageFindings()
responsavel: "@shield"
responsavel_type: Agent
atomic_layer: Task
elicit: true

Entrada:
  - campo: findings_list
    tipo: array
    origem: Audit results or manual input
    obrigatorio: true
    validacao: List of findings with severity, CVSS, and description

Saida:
  - campo: prioritized_findings
    tipo: array
    destino: Console / Report
    persistido: false

Checklist:
  - "[ ] Collect all findings"
  - "[ ] Classify by CVSS score"
  - "[ ] Assess business impact"
  - "[ ] Estimate remediation effort"
  - "[ ] Generate priority matrix"
  - "[ ] Output prioritized list with recommendations"
---

# Triage Findings

## Purpose

Receive a list of security findings, classify them by severity/impact/effort, and produce a prioritized remediation order.

## Execution

### Step 1: Collect Findings

Accept findings from:
- Other agents' audit results
- Manual input (user provides finding list)
- Previous audit reports

### Step 2: Classify Each Finding

For each finding, determine:

| Factor | Scale | Weight |
|--------|-------|--------|
| CVSS Score | 0.0 - 10.0 | 40% |
| Business Impact | Low/Medium/High | 30% |
| Remediation Effort | 15min / 30min / 1h / 2h+ | 20% |
| PII Affected | Count of people | 10% |

### Step 3: Priority Formula

```
Priority = (CVSS × 0.4) + (Impact × 0.3) + (InverseEffort × 0.2) + (PIIFactor × 0.1)

Where:
  Impact: Low=1, Medium=5, High=10
  InverseEffort: 2h+=1, 1h=3, 30min=7, 15min=10
  PIIFactor: 0=0, 1-10=3, 11-100=7, 100+=10
```

### Step 4: Output Priority Matrix

```
PRIORITY MATRIX
═══════════════════════════════════════
Phase 0 — Emergency (24-48h):
  1. [CVSS 9.1] F01 - PII without RLS (93+ people, 10min fix)
  2. [CVSS 9.1] AUTH-C1 - PII via allowed_emails (15min fix)
  ...

Phase 1 — Urgent (1-2 weeks):
  ...

Phase 2 — Planned (2-4 weeks):
  ...

Phase 3 — Hardening (3+ months):
  ...
```

## NIST 800-53 Mapping

Each finding is mapped to relevant NIST controls:
- **AC-3** (Access Enforcement) — RLS, auth checks
- **CM-6/CM-7** (Configuration) — CORS, headers, hints
- **IA-5** (Authentication) — Rate limiting, passwords
- **SC-8** (Transmission) — TLS, headers
- **SI-12** (Information Handling) — PII exposure
