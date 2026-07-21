# Task: Security Posture Check

**Task ID:** security-posture-check
**Agent:** @watchdog
**Priority:** HIGH
**Tools Required:** Nenhuma ferramenta externa obrigatoria (analise manual + frameworks)

---

## Objetivo

Avaliar a postura de seguranca geral de um ambiente, sistema ou organizacao usando frameworks reconhecidos (NIST CSF, CIS Controls). Produzir um relatorio com score, gaps identificados e recomendacoes priorizadas.

> **Foco educacional:** Cada gap identificado vem com explicacao do *porque* e importa e *como* resolver.

---

## Pre-requisitos

- Acesso a informacoes sobre o ambiente alvo (infra, apps, processos)
- Conhecimento basico de quais sistemas/servicos estao em uso
- Opcional: documentacao de seguranca existente (politicas, procedures)

---

## Inputs

| Parametro | Descricao | Exemplo |
|-----------|-----------|---------|
| TARGET_ENV | Descricao do ambiente | `App web em produção na AWS` |
| SCOPE | Escopo da avaliacao | `full`, `network`, `application`, `cloud` |
| FRAMEWORK | Framework de referencia | `nist-csf`, `cis-controls`, `both` |
| EXISTING_DOCS | Docs de seguranca existentes | Path para politicas, se houver |

---

## Workflow

### Step 1: Inventario do Ambiente

> "Nao protege o que nao conhece." — CIS Control #1

Levantar informacoes sobre o ambiente:

```markdown
## Inventario

### Ativos
- [ ] Servidores/VPS listados
- [ ] Aplicacoes web/mobile identificadas
- [ ] Bancos de dados catalogados
- [ ] Servicos de terceiros (SaaS) listados
- [ ] APIs externas documentadas

### Dados
- [ ] Tipos de dados armazenados classificados (publico, interno, confidencial, restrito)
- [ ] Fluxo de dados mapeado (onde entra, onde armazena, onde sai)
- [ ] Dados regulados identificados (LGPD, PCI, HIPAA)

### Pessoas
- [ ] Equipe de TI/Dev identificada
- [ ] Responsavel por seguranca definido
- [ ] Processo de onboarding/offboarding documentado
```

### Step 2: Avaliacao NIST CSF

Avaliar cada funcao do framework:

```markdown
## NIST CSF Assessment

### IDENTIFY (Identificar)
| Controle | Status | Evidencia | Gap |
|----------|--------|-----------|-----|
| Inventario de ativos | ⬜ | | |
| Classificacao de dados | ⬜ | | |
| Risk assessment | ⬜ | | |
| Governance de seguranca | ⬜ | | |

### PROTECT (Proteger)
| Controle | Status | Evidencia | Gap |
|----------|--------|-----------|-----|
| Controle de acesso | ⬜ | | |
| Awareness/treinamento | ⬜ | | |
| Protecao de dados | ⬜ | | |
| Processos de protecao | ⬜ | | |

### DETECT (Detectar)
| Controle | Status | Evidencia | Gap |
|----------|--------|-----------|-----|
| Monitoramento de anomalias | ⬜ | | |
| Monitoramento continuo | ⬜ | | |
| Processos de deteccao | ⬜ | | |

### RESPOND (Responder)
| Controle | Status | Evidencia | Gap |
|----------|--------|-----------|-----|
| Plano de resposta | ⬜ | | |
| Comunicacao | ⬜ | | |
| Analise de incidentes | ⬜ | | |
| Mitigacao | ⬜ | | |

### RECOVER (Recuperar)
| Controle | Status | Evidencia | Gap |
|----------|--------|-----------|-----|
| Plano de recuperacao | ⬜ | | |
| Backups testados | ⬜ | | |
| Licoes aprendidas | ⬜ | | |
```

### Step 3: Avaliacao CIS Controls (Top 6)

```markdown
## CIS Controls Assessment

| # | Controle | Status | Notas |
|---|----------|--------|-------|
| 1 | Inventario de ativos de hardware | ⬜ | |
| 2 | Inventario de ativos de software | ⬜ | |
| 3 | Protecao de dados | ⬜ | |
| 4 | Configuracao segura | ⬜ | |
| 5 | Gestao de contas | ⬜ | |
| 6 | Gestao de vulnerabilidades | ⬜ | |
```

### Step 4: Calcular Score e Priorizar

**Criterios de scoring:**

| Status | Pontos | Significado |
|--------|--------|-------------|
| ✅ Implementado | 3 | Controle em vigor e funcionando |
| 🟡 Parcial | 1 | Existe mas incompleto ou inconsistente |
| ❌ Ausente | 0 | Nao implementado |
| N/A | - | Nao aplicavel ao escopo |

**Priorizacao de gaps:**

| Prioridade | Criterio |
|------------|----------|
| P0 - Critico | Risco iminente de breach, dados expostos |
| P1 - Alto | Controle basico ausente, facil de explorar |
| P2 - Medio | Melhoria importante, risco moderado |
| P3 - Baixo | Nice-to-have, maturidade de seguranca |

### Step 5: Gerar Relatorio

Compilar findings em report estruturado (ver template abaixo).

---

## Report Template

```markdown
# Security Posture Assessment Report

**Ambiente:** {{TARGET_ENV}}
**Data:** {{DATE}}
**Analista:** @watchdog
**Framework:** {{FRAMEWORK}}
**Escopo:** {{SCOPE}}

## Executive Summary

**Score geral:** X/Y (Z%)
**Classificacao:** [Critico | Fraco | Aceitavel | Bom | Excelente]

| Area | Score | Status |
|------|-------|--------|
| Identify | X/Y | ⬜ |
| Protect | X/Y | ⬜ |
| Detect | X/Y | ⬜ |
| Respond | X/Y | ⬜ |
| Recover | X/Y | ⬜ |

## Top 5 Gaps Criticos

### 1. [GAP TITLE]
- **Area:** NIST CSF / CIS Control #X
- **Risco:** Descricao do risco
- **Por que importa:** Explicacao educacional
- **Como resolver:** Passos praticos
- **Prioridade:** P0/P1/P2/P3

## Roadmap de Melhorias

### Imediato (0-30 dias)
1. ...

### Curto prazo (30-90 dias)
1. ...

### Medio prazo (90-180 dias)
1. ...

## Detalhamento por Area
[Assessment completo de cada area]
```

---

## Output

```
posture-check-YYYYMMDD/
├── inventario.md          # Inventario do ambiente
├── nist-csf-assessment.md # Avaliacao NIST CSF completa
├── cis-controls.md        # Avaliacao CIS Controls
├── gaps-prioritized.md    # Gaps priorizados
└── REPORT.md              # Report final
```

---

## Handoff

1. **Gaps em codigo**: Encaminhar para @shield (code-security-review)
2. **Gaps em logs/deteccao**: Encaminhar para @sentinel (log-analysis)
3. **Gaps em hardening**: Encaminhar para @watchdog (hardening-assessment)
4. **Dependencias vulneraveis**: Encaminhar para @shield (dependency-audit)

---

## Dicas

- Comece pelo inventario — sem ele, todo o resto e incompleto
- Nao precisa resolver tudo de uma vez. Priorize P0 e P1
- Um controle parcial (🟡) ainda e melhor que ausente (❌)
- Documente TUDO — mesmo o que parece obvio
- Compare com o report anterior para medir evolucao

---

*Task Version: 1.0*
*Created: 2026-02-16*
