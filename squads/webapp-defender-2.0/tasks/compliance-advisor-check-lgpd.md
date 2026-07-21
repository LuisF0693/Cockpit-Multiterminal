---
task: checkLgpd()
responsavel: "@compliance-advisor"
responsavel_type: Agent
atomic_layer: Task
elicit: true

Entrada:
  - campo: app_context
    tipo: string
    origem: User description or audit results
    obrigatorio: true

Saida:
  - campo: lgpd_assessment
    tipo: object
    destino: Console / Report
    persistido: true

Checklist:
  - "[ ] Map data processing activities"
  - "[ ] Check legal basis for processing (Art. 7)"
  - "[ ] Check sensitive data handling (Art. 11)"
  - "[ ] Verify security measures (Art. 46)"
  - "[ ] Assess breach notification need (Art. 48)"
  - "[ ] Check data subject rights implementation"
  - "[ ] Generate compliance score and recommendations"
---

# Check LGPD Compliance

## Purpose

Assess application compliance with Brazilian LGPD (Lei Geral de Protecao de Dados). Based on violations found across 3 audited applications.

## Assessment Framework

### Articles Checked

| Article | Requirement | How to Verify |
|---------|-------------|---------------|
| Art. 6, I | Finalidade legitima | Data used only for stated purpose? |
| Art. 6, VII | Seguranca | Technical measures adequate? |
| Art. 6, X | Confianca | Data handled as user expects? |
| Art. 7 | Legal basis | Valid basis for each processing? |
| Art. 11 | Dados sensiveis | Explicit consent for sensitive data? |
| Art. 46 | Medidas tecnicas | Security controls implemented? |
| Art. 48 | Notificacao | Breach notification required? |
| Art. 18 | Direitos do titular | Rights exercisable? |

### Scoring

| Score | Status | Description |
|-------|--------|-------------|
| 90-100% | COMPLIANT | Minor improvements needed |
| 70-89% | PARTIALLY COMPLIANT | Action plan required |
| 50-69% | NON-COMPLIANT | Significant gaps |
| < 50% | CRITICALLY NON-COMPLIANT | Immediate action required |
