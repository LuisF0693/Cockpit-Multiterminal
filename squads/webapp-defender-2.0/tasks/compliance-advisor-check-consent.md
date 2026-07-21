---
task: checkConsent()
responsavel: "@compliance-advisor"
responsavel_type: Agent
atomic_layer: Task
elicit: false

Entrada:
  - campo: app_info
    tipo: string
    origem: App URL, code, or description
    obrigatorio: true

Saida:
  - campo: consent_findings
    tipo: array
    destino: Console / Shield
    persistido: false

Checklist:
  - "[ ] Check cookie/analytics consent banner"
  - "[ ] Check privacy policy presence and content"
  - "[ ] Check data processing terms"
  - "[ ] Check opt-out mechanism"
  - "[ ] Check data deletion request support"
  - "[ ] Generate findings"
---

# Check Consent Mechanisms

## Purpose

Verify consent mechanisms are properly implemented. Microsoft Clarity without consent was found in audited applications.

## Checks

| Item | Required | Violation Example |
|------|----------|------------------|
| Cookie banner before analytics | Yes | Clarity loads before consent |
| Privacy policy link | Yes | No link in footer |
| Opt-in (not opt-out) | Yes | Analytics active by default |
| Data deletion option | Yes | No way to request deletion |
| Consent record storage | Recommended | No audit trail of consent |
