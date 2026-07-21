# {APP_NAME} — Relatório de Auditoria de Segurança

**Documento:** Relatório de Auditoria Passiva de Segurança
**Classificação:** CONFIDENCIAL
**Preparado por:** {AUDITOR}
**Data:** {DATE}
**Framework:** NIST 800-53 Rev. 5 / OWASP Top 10 2021 / LGPD
**Metodologia:** Auditoria passiva (ZERO testes intrusivos)

---

## 1. Sumário Executivo

| Campo | Valor |
|-------|-------|
| **Score** | {SCORE} |
| **Findings Ativos** | {FINDING_COUNT} |
| **PII Exposta** | {PII_COUNT} pessoas |
| **Classificação** | {CLASSIFICATION} |

### Distribuição por Severidade

| Severidade | Quantidade |
|------------|-----------|
| CRITICAL | {CRITICAL_COUNT} |
| HIGH | {HIGH_COUNT} |
| MEDIUM | {MEDIUM_COUNT} |
| LOW/INFO | {LOW_COUNT} |

---

## 2. Escopo

| Campo | Valor |
|-------|-------|
| **Aplicação** | {APP_URL} |
| **Stack** | {STACK} |
| **Metodologia** | Auditoria passiva — análise de configurações, políticas e código |
| **Ferramentas** | Revisão manual de SQL, headers HTTP, OpenAPI schema |

---

## 3. Findings

| ID | Título | Sev. | CVSS | OWASP | NIST | Remediação |
|----|--------|------|------|-------|------|------------|
| {ID} | {TITLE} | {SEV} | {CVSS} | {OWASP} | {NIST} | {FIX_SUMMARY} |

### {FINDING_ID} — {FINDING_TITLE}

**Severidade:** {SEVERITY} | **CVSS:** {SCORE} | **OWASP:** {CATEGORY} | **NIST:** {CONTROLS}

**Descrição:**
{DESCRIPTION}

**Evidência:**
{EVIDENCE}

**Impacto:**
{IMPACT}

**Remediação:**
```
{FIX_CODE}
```

---

## 4. Conformidade LGPD

| Artigo | Requisito | Status | Findings |
|--------|-----------|--------|----------|
| Art. 6, VII | Segurança | {STATUS} | {FINDINGS} |
| Art. 46 | Medidas técnicas | {STATUS} | {FINDINGS} |

---

## 5. Roadmap de Remediação

### Fase 0 — Emergência (24-48h)
| # | Ação | Esforço | Finding |
|---|------|---------|---------|

### Fase 1 — Urgente (1-2 semanas)
| # | Ação | Esforço | Finding |
|---|------|---------|---------|

---

## 6. Conclusão

{CONCLUSION}

---

*Auditoria conduzida pelo webapp-defender squad (SAIOS)*
*Metodologia: Auditoria passiva — análise de configurações, políticas e código*
*ZERO testes intrusivos realizados*
*{DATE}*
