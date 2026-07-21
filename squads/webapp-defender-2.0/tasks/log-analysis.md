# Task: Log Analysis

**Task ID:** log-analysis
**Agent:** @sentinel
**Priority:** HIGH
**Tools Required:** Grep, Read, Bash (ferramentas nativas do Claude Code)

---

## Objetivo

Analisar logs de sistema, aplicacao e seguranca para identificar anomalias, indicadores de comprometimento (IOCs) e comportamento suspeito. Estabelecer baselines e criar regras de deteccao.

> **Foco educacional:** Ensina a transformar logs "crus" em inteligencia acionavel. Cada anomalia vem com explicacao do *porque* e suspeita.

---

## Pre-requisitos

- Acesso aos logs do ambiente (auth, app, web server, firewall)
- Baseline de comportamento normal (ou esta task ajuda a criar)
- Opcional: lista de IOCs conhecidos para correlacao

---

## Inputs

| Parametro | Descricao | Exemplo |
|-----------|-----------|---------|
| LOG_SOURCE | Origem dos logs | `auth.log`, `access.log`, `app.log`, `syslog` |
| LOG_PATH | Path dos arquivos de log | `/var/log/` ou path local |
| TIME_RANGE | Periodo de analise | `last 24h`, `2026-02-15 to 2026-02-16` |
| CONTEXT | Contexto da analise | `investigation`, `baseline`, `routine-check` |
| KNOWN_IOCS | IOCs conhecidos (opcional) | Lista de IPs, hashes, dominios |

---

## Workflow

### Step 1: Coletar e Normalizar

> "Logs de fontes diferentes falam linguas diferentes. Normalize primeiro."

**Identificar formato:**

| Tipo de Log | Formato Comum | Campos Chave |
|-------------|---------------|--------------|
| Auth (Linux) | syslog | timestamp, hostname, service, message |
| Apache/Nginx | Combined Log | IP, timestamp, method, URL, status, user-agent |
| Application | JSON/structured | timestamp, level, message, context |
| Firewall | syslog/custom | timestamp, action, src_ip, dst_ip, port |
| Windows Event | XML/EVTX | EventID, timestamp, source, message |

**Checklist de coleta:**
```markdown
- [ ] Logs coletados para o periodo correto
- [ ] Formato identificado e parseavel
- [ ] Timezone verificado (todos em UTC ou ajustados)
- [ ] Volume de logs parece normal (nao truncado)
```

### Step 2: Estabelecer Baseline

> "Sem baseline, tudo parece anomalia. Ou nada parece."

**O que medir para baseline:**

| Metrica | Como Medir | Exemplo Normal |
|---------|------------|----------------|
| Logins por hora | Count por hora | 10-50/hora em horario comercial |
| IPs unicos | Distinct IPs | ~100 IPs internos conhecidos |
| Erros 4xx/5xx | Count por hora | < 5% do total de requests |
| Processos unicos | Distinct process names | Lista conhecida de servicos |
| Trafego por porta | Bytes por porta | 80/443 dominam, resto minimo |

**Comandos uteis para baseline (Linux):**

```bash
# Logins por hora (auth.log)
grep "Accepted\|Failed" /var/log/auth.log | \
  awk '{print $1, $2, substr($3,1,2)":00"}' | sort | uniq -c

# Top 10 IPs em access log
awk '{print $1}' /var/log/nginx/access.log | sort | uniq -c | sort -rn | head -10

# Distribuicao de status codes HTTP
awk '{print $9}' /var/log/nginx/access.log | sort | uniq -c | sort -rn

# Processos unicos em execucao
ps aux | awk '{print $11}' | sort -u
```

### Step 3: Hunting de Anomalias

> "Anomalia nao e necessariamente maliciosa — mas toda atividade maliciosa e anomala."

#### 3a. Authentication Anomalies

```markdown
## Auth Log Analysis

Buscar:
- [ ] Brute force: muitas falhas seguidas do mesmo IP ou usuario
- [ ] Password spraying: poucas falhas por usuario, muitos usuarios
- [ ] Logins fora do horario (antes 7h ou depois 22h)
- [ ] Logins de IPs/geolocalizacoes incomuns
- [ ] Escalacao de privilegios (sudo, su)
- [ ] Contas de servico usadas interativamente
```

**Comandos de hunting (Linux):**

```bash
# Brute force detection: top failed logins
grep "Failed password" /var/log/auth.log | \
  awk '{print $(NF-3)}' | sort | uniq -c | sort -rn | head -20

# Logins fora do horario
grep "Accepted" /var/log/auth.log | \
  awk -F: '{h=int($1); if(h<7 || h>22) print}'

# Escalacao de privilegios
grep -E "sudo|su:" /var/log/auth.log | grep -v "session opened"

# Contas com login interativo + servico
grep "Accepted" /var/log/auth.log | awk '{print $9}' | sort -u
```

#### 3b. Web/Application Anomalies

```markdown
## Web Log Analysis

Buscar:
- [ ] SQL injection attempts (UNION, SELECT, OR 1=1)
- [ ] Path traversal (../, etc/passwd)
- [ ] Scanner signatures (Nikto, SQLMap, DirBuster user-agents)
- [ ] Excessive 404s (directory bruting)
- [ ] Unusual HTTP methods (PUT, DELETE, TRACE)
- [ ] Large response sizes (data exfiltration)
- [ ] Requests de bots maliciosos
```

**Comandos de hunting:**

```bash
# SQL injection attempts
grep -iE "union.*select|or.*1.*=.*1|drop.*table|insert.*into" /var/log/nginx/access.log

# Path traversal
grep -E "\.\./|etc/passwd|etc/shadow|proc/self" /var/log/nginx/access.log

# Scanner detection (user-agents)
grep -iE "nikto|sqlmap|dirbuster|gobuster|nmap|masscan" /var/log/nginx/access.log

# Excessive 404s por IP
awk '$9 == 404 {print $1}' /var/log/nginx/access.log | sort | uniq -c | sort -rn | head -10

# Methods incomuns
awk '$6 !~ /GET|POST|HEAD/ {print}' /var/log/nginx/access.log
```

#### 3c. Network/System Anomalies

```markdown
## Network/System Log Analysis

Buscar:
- [ ] Conexoes para IPs maliciosos conhecidos
- [ ] DNS queries para dominios suspeitos
- [ ] Portas incomuns com trafego
- [ ] Processos desconhecidos iniciados
- [ ] Scheduled tasks novas ou modificadas
- [ ] Modificacoes em arquivos criticos
```

### Step 4: Correlacao de IOCs

Se houver IOCs conhecidos:

```markdown
## IOC Correlation

| IOC | Tipo | Encontrado? | Onde | Timestamp |
|-----|------|-------------|------|-----------|
| 1.2.3.4 | IP | ⬜ | | |
| evil.com | Domain | ⬜ | | |
| abc123... | Hash | ⬜ | | |
```

### Step 5: Criar Regras de Deteccao

Para cada anomalia confirmada, criar regra Sigma:

```yaml
# Template de regra Sigma
title: [Descricao da deteccao]
status: experimental
description: [O que detecta e por que]
logsource:
  category: [process_creation|authentication|webserver|firewall]
  product: [windows|linux|apache|nginx]
detection:
  selection:
    FieldName|contains: 'value'
  condition: selection
falsepositives:
  - [Cenarios legitimos que podem triggerar]
level: [low|medium|high|critical]
tags:
  - attack.[tatica]
  - attack.[tecnica]
```

### Step 6: Documentar e Reportar

---

## Report Template

```markdown
# Log Analysis Report

**Fonte:** {{LOG_SOURCE}}
**Periodo:** {{TIME_RANGE}}
**Contexto:** {{CONTEXT}}
**Data:** {{DATE}}
**Analista:** @sentinel

## Executive Summary

| Metrica | Valor |
|---------|-------|
| Logs analisados | X |
| Anomalias encontradas | X |
| IOCs correlacionados | X/Y |
| Regras de deteccao criadas | X |
| Severidade maxima | Critical/High/Medium/Low |

## Baseline

[Resumo do comportamento normal observado]

## Anomalias Identificadas

### 1. [ANOMALIA TITLE]
- **Severidade:** Critical / High / Medium / Low
- **Tipo:** Auth / Web / Network / System
- **Periodo:** Quando ocorreu
- **Evidencia:** Logs relevantes (sanitizados)
- **Analise:** Por que e suspeito
- **MITRE ATT&CK:** T[XXXX] - [Tecnica]
- **Acao recomendada:** O que fazer

## IOC Report
[Correlacoes encontradas]

## Regras de Deteccao Criadas
[Sigma rules geradas]

## Recomendacoes
1. [Acoes imediatas]
2. [Melhorias no logging]
3. [Gaps na visibilidade]
```

---

## Output

```
log-analysis-YYYYMMDD/
├── baseline.md            # Baseline estabelecido
├── anomalies/
│   ├── auth-anomalies.md  # Anomalias de autenticacao
│   ├── web-anomalies.md   # Anomalias web
│   └── system-anomalies.md # Anomalias de sistema
├── ioc-correlation.md     # Correlacao de IOCs
├── sigma-rules/
│   └── *.yml              # Regras de deteccao criadas
└── REPORT.md              # Report final
```

---

## Handoff

1. **Incidente confirmado**: Escalar para @watchdog (ir-plan)
2. **Vulnerabilidades em codigo**: Encaminhar para @shield (code-security-review)
3. **Gaps de hardening**: Encaminhar para @watchdog (hardening-assessment)
4. **Regras criadas**: Documentar e adicionar ao SIEM/monitoramento

---

## Dicas

- Logs sao a "camera de seguranca" digital — aprenda a le-los
- Comece pelo baseline: sem saber o "normal", voce nao detecta o "anormal"
- Nem toda anomalia e ataque, mas todo ataque gera anomalia
- `grep`, `awk`, `sort`, `uniq -c` sao suas melhores ferramentas
- Documente seus comandos — investigacoes nao reproduziveis nao tem valor
- Quando encontrar algo suspeito, pergunte: "qual e a hipotese mais simples?"
- Uma unica linha de log pode contar uma historia inteira — aprenda a interpreta-la

---

*Task Version: 1.0*
*Created: 2026-02-16*
