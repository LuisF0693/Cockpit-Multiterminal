# Task: Dependency Audit

**Task ID:** dependency-audit
**Agent:** @shield
**Priority:** HIGH
**Tools Required:** Bash (npm audit, pip-audit), Read, Grep

---

## Objetivo

Auditar dependencias de um projeto para identificar vulnerabilidades conhecidas (CVEs), dependencias desatualizadas e riscos de supply chain. Gerar relatorio com recomendacoes de atualizacao priorizadas.

> **Foco educacional:** Explica *por que* dependencias vulneraveis sao perigosas, como avaliar o risco real e como atualizar com seguranca.

---

## Pre-requisitos

- Projeto com gerenciador de pacotes (npm, pip, go mod, maven, etc.)
- Lock file existente (package-lock.json, yarn.lock, poetry.lock, etc.)
- Acesso ao codigo fonte para verificar uso real das dependencias

---

## Inputs

| Parametro | Descricao | Exemplo |
|-----------|-----------|---------|
| TARGET_PATH | Path do projeto | `/path/to/project` |
| PACKAGE_MANAGER | Gerenciador de pacotes | `npm`, `yarn`, `pip`, `go`, `maven`, `cargo` |
| SEVERITY_THRESHOLD | Severidade minima | `critical`, `high`, `medium`, `all` |

---

## Workflow

### Step 1: Inventario de Dependencias

> "Saiba exatamente o que esta no seu projeto."

**Node.js (npm/yarn):**
```bash
cd {{TARGET_PATH}}

# Total de dependencias
npm ls --all --json 2>/dev/null | jq '.dependencies | length'

# Dependencias diretas vs transitive
echo "Diretas: $(jq '.dependencies | length' package.json)"
echo "Total (incluindo transitive): $(npm ls --all --parseable 2>/dev/null | wc -l)"

# Dependencias sem uso aparente
# (comparar package.json com imports no codigo)
npx depcheck 2>/dev/null || echo "Install: npm install -g depcheck"
```

**Python (pip):**
```bash
cd {{TARGET_PATH}}

# Listar dependencias
pip list --format=json

# Dependencias diretas
cat requirements.txt 2>/dev/null || cat pyproject.toml 2>/dev/null

# Arvore de dependencias
pip install pipdeptree 2>/dev/null && pipdeptree
```

**Checklist de inventario:**
```markdown
- [ ] Total de dependencias diretas contado
- [ ] Total de dependencias transitivas contado
- [ ] Lock file presente e commitado
- [ ] Dependencias nao utilizadas identificadas
```

### Step 2: Vulnerability Scan

> "CVEs em dependencias sao as vulnerabilidades mais faceis de explorar — e as mais faceis de corrigir."

**Node.js:**
```bash
cd {{TARGET_PATH}}

# npm audit (built-in)
npm audit --json > audit-results.json
npm audit

# Apenas critical e high
npm audit --audit-level=high

# Resumo rapido
npm audit 2>&1 | tail -20
```

**Python:**
```bash
cd {{TARGET_PATH}}

# pip-audit
pip install pip-audit 2>/dev/null
pip-audit --format json > audit-results.json
pip-audit

# Safety (alternativa)
pip install safety 2>/dev/null
safety check --json > safety-results.json
```

**Go:**
```bash
cd {{TARGET_PATH}}

# govulncheck (oficial do Go)
go install golang.org/x/vuln/cmd/govulncheck@latest
govulncheck ./...
```

### Step 3: Analise de Risco Real

> "Nem toda CVE em dependencia e exploitavel no seu contexto."

Para cada vulnerabilidade encontrada, avaliar:

```markdown
## Risk Assessment Matrix

| CVE | Dependencia | Severidade CVSS | Exploitavel? | Impacto Real | Prioridade |
|-----|-------------|-----------------|--------------|-------------|------------|
| CVE-XXXX-YYYY | package@1.0 | 9.8 Critical | ⬜ Sim/Nao | ⬜ | P0/P1/P2/P3 |
```

**Criterios de exploitabilidade:**

| Pergunta | Se SIM | Se NAO |
|----------|--------|--------|
| O codigo do projeto usa a funcao vulneravel? | Risco alto | Risco baixo |
| A vulnerabilidade e alcancavel via input externo? | Risco alto | Risco medio |
| Existe exploit publico? | Risco critico | Risco medio |
| E dependencia direta ou transitiva profunda? | Direta = mais risco | Transitiva = talvez menor |
| Tem fix disponivel? | Pode corrigir agora | Monitorar |

**Como verificar uso real:**
```bash
# Verificar se o codigo usa a funcao vulneravel (Node.js)
grep -r "require('vulnerable-package')" {{TARGET_PATH}}/src/
grep -r "from 'vulnerable-package'" {{TARGET_PATH}}/src/

# Verificar em qual contexto e usado
grep -rn "vulnerable-function" {{TARGET_PATH}}/src/
```

### Step 4: Supply Chain Risk

> "Confianca cega em dependencias e o novo vetor de ataque."

```markdown
## Supply Chain Assessment

| Check | Status | Detalhes |
|-------|--------|----------|
| Dependencias de fontes confiaveis (npm, PyPI oficial) | ⬜ | |
| Nenhuma dependencia com typosquatting | ⬜ | |
| Dependencias com manutencao ativa | ⬜ | |
| Nenhuma dependencia deprecated | ⬜ | |
| Lock file commitado e usado | ⬜ | |
| Nenhum postinstall script suspeito | ⬜ | |
```

**Verificacoes (Node.js):**
```bash
cd {{TARGET_PATH}}

# Dependencias deprecated
npm outdated

# Scripts postinstall (podem ser maliciosos)
cat node_modules/*/package.json | jq -r 'select(.scripts.postinstall) | .name + ": " + .scripts.postinstall' 2>/dev/null

# Packages com poucos downloads (possivel typosquatting)
# Verificar manualmente no npmjs.com
```

### Step 5: Plano de Atualizacao

> "Atualizar dependencias nao e so dar npm update — precisa de estrategia."

**Classificacao de updates:**

| Tipo | Risco | Exemplo | Acao |
|------|-------|---------|------|
| Patch (x.x.X) | Baixo | 1.2.3 → 1.2.4 | Atualizar sem medo |
| Minor (x.X.0) | Medio | 1.2.0 → 1.3.0 | Atualizar + testar |
| Major (X.0.0) | Alto | 1.0.0 → 2.0.0 | Planejar migracao |

**Processo seguro de atualizacao:**

```markdown
1. [ ] Criar branch para updates
2. [ ] Atualizar UMA dependencia por vez (para critical/high)
3. [ ] Rodar testes apos cada update
4. [ ] Verificar breaking changes no CHANGELOG
5. [ ] Atualizar lock file
6. [ ] Code review do diff no lock file
7. [ ] Merge apenas se testes passam
```

**Comandos:**
```bash
# Ver o que vai mudar
npm outdated

# Update seguro (apenas patch/minor)
npm update

# Update de pacote especifico
npm install package@latest

# Verificar o que mudou
npm audit
npm test
```

---

## Report Template

```markdown
# Dependency Audit Report

**Projeto:** {{TARGET_PATH}}
**Package Manager:** {{PACKAGE_MANAGER}}
**Data:** {{DATE}}
**Analista:** @shield

## Summary

| Metrica | Valor |
|---------|-------|
| Dependencias diretas | X |
| Dependencias totais (transitivas) | X |
| Vulnerabilidades Critical | X |
| Vulnerabilidades High | X |
| Vulnerabilidades Medium | X |
| Vulnerabilidades Low | X |
| Dependencias deprecated | X |
| Dependencias sem uso | X |

## Risk Score

**Score:** X/10 (10 = sem riscos)

| Nivel | Criterio |
|-------|----------|
| 9-10 | Sem CVEs critical/high, deps atualizadas |
| 7-8 | CVEs apenas medium/low, algumas deps outdated |
| 5-6 | 1-2 CVEs high, deps significativamente outdated |
| 3-4 | CVEs critical presentes, supply chain risks |
| 0-2 | Multiplas CVEs critical, deps abandonadas |

## Critical & High Vulnerabilities

### CVE-XXXX-YYYY — [Package Name]
- **Severity:** Critical (CVSS 9.8)
- **Installed:** 1.0.0
- **Fixed in:** 1.0.1
- **Exploitavel no projeto:** Sim/Nao
- **Analise:** [Como a vuln afeta este projeto]
- **Fix:** `npm install package@1.0.1`

## Update Plan

### Imediato (P0 — Critical/High com exploit)
| Package | Current | Target | Type | Risk |
|---------|---------|--------|------|------|
| pkg-a | 1.0.0 | 1.0.1 | patch | low |

### Curto prazo (P1 — High sem exploit, Medium)
[...]

### Medio prazo (P2 — Atualizacoes de manutencao)
[...]

## Supply Chain Assessment
[Resultado da avaliacao]

## Recomendacoes
1. Corrigir CVEs P0 imediatamente
2. Implementar npm audit no CI/CD
3. Habilitar Dependabot/Renovate
4. Remover dependencias nao utilizadas
5. Revisar scripts postinstall
```

---

## Output

```
dependency-audit-YYYYMMDD/
├── inventory.md           # Inventario de dependencias
├── audit-results.json     # Resultado bruto do scan
├── risk-assessment.md     # Analise de risco real
├── supply-chain.md        # Avaliacao supply chain
├── update-plan.md         # Plano de atualizacao priorizado
└── REPORT.md              # Report final
```

---

## Handoff

1. **CVEs com exploit publico**: Acao imediata — atualizar
2. **Vulnerabilidades em codigo proprio**: Encaminhar para @shield (code-security-review)
3. **Gaps em monitoramento**: Encaminhar para @sentinel (log-analysis)
4. **Postura geral**: Alimentar @watchdog (security-posture-check)

---

## Dicas

- `npm audit` e gratuito e instantaneo — rode TODO dia
- Nem toda CVE e critica no SEU contexto. Avalie o risco REAL
- Lock files existem por um motivo — SEMPRE commite o lock file
- Dependencia popular nao significa dependencia segura
- `node_modules` e um territorio selvagem — scripts postinstall podem fazer QUALQUER coisa
- Uma dependencia abandonada e uma bomba-relogio
- Automatize com Dependabot/Renovate — humanos esquecem, bots nao
- Menos dependencias = menos superficie de ataque. Questione cada `npm install`

---

*Task Version: 1.0*
*Created: 2026-02-16*
