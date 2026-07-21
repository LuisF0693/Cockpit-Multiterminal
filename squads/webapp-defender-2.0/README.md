# WebApp Defender v2.0

> Squad defensivo completo de seguranca para aplicacoes web.
> Auditoria passiva + threat hunting + hardening + resposta a incidentes.
> **ZERO testes intrusivos.**

---

## Sobre

O **WebApp Defender** e um squad de seguranca defensiva para o [AIOS](https://github.com/SynkraAI/aios-core) (AI Orchestrated System). Ele encontra vulnerabilidades em aplicacoes web de forma **100% passiva** — analisando configuracoes, codigo, policies e logs — e gera codigo de correcao pronto para aplicar.

A v2.0 unifica dois squads em um:
- **WebApp Defender** (v1.0) — auditoria de app-layer, RLS, auth, compliance
- **Blue Team** (v1.0) — threat hunting, log analysis, incident response, hardening

### Construido a partir de dados reais

| Metrica | Valor |
|---------|-------|
| Vulnerabilidades analisadas | 41 |
| Severidade CRITICAL | 9 |
| Severidade HIGH | 15 |
| Severidade MEDIUM | 13 |
| Pessoas com PII exposta | 280+ |
| Apps auditadas | 3 (Supabase + Vercel) |

Frameworks de referencia: OWASP Top 10, NIST CSF, CIS Controls, NIST 800-53, MITRE ATT&CK, CVSS 3.1, LGPD.

---

## Instalacao

### Pre-requisitos

- **AIOS Core** >= 2.1.0
- **Claude Code** com acesso ao projeto

### Setup

1. Copie (ou extraia) a pasta `webapp-defender/` para o diretorio `squads/` do seu projeto AIOS:

```
seu-projeto/
└── squads/
    └── webapp-defender/   <-- cole aqui
```

2. Pronto. O AIOS detecta o squad automaticamente.

Para verificar: abra o Claude Code no diretorio do projeto e digite `@shield *help`. Se o agente responder, esta funcionando.

---

## Quick Start

### 1. Auditoria rapida (~10 min)

```
@shield *quick-check
```

Verifica headers HTTP, CORS e exposicao de OpenAPI. Retorna um resumo com quick wins.

### 2. Auditoria focada em RLS (~30-60 min)

```
@shield *rls-audit
```

Audita todas as tabelas e RPCs do Supabase. Ideal se voce usa Supabase e quer garantir que RLS esta correto.

### 3. Auditoria completa (~1-3h)

```
@shield *audit
```

Pipeline completo: inventario -> scan passivo -> revisao profunda -> compliance LGPD -> remediacao -> relatorio.

---

## Arquitetura

```
@shield (Orchestrador)
|
|-- Tier 1: MINDS (Especialistas)
|   |-- @rls-guardian        -> RLS & Access Control
|   |-- @config-sentinel     -> Configuracoes de seguranca
|   |-- @auth-inspector      -> Autenticacao & autorizacao
|   |-- @compliance-advisor  -> LGPD & privacidade
|
|-- Tier 2: TOOLS (Operacionais passivos)
|   |-- @header-analyzer     -> Analisa headers HTTP
|   |-- @schema-reviewer     -> Analisa exposicao de schema
|   |-- @policy-validator    -> Valida RLS policies em SQL
|   |-- @fix-generator       -> Gera codigo de correcao
|
|-- Tier 3: BLUE TEAM (Hunting, Hardening, Code Review)
    |-- @sentinel            -> Threat hunting & log analysis
    |-- @watchdog            -> Security posture & incident response
    |-- @code-guardian       -> OWASP code review & secrets detection
```

**12 agentes** organizados em 4 camadas. Cada agente tem escopo claro e pode ser usado individualmente ou via orchestrador.

---

## Todos os Agentes e Comandos

### Tier 0: Orchestrador

#### @shield — Defense Coordinator

O ponto de entrada principal. Coordena os demais agentes, prioriza findings e gera roadmaps.

| Comando | O que faz |
|---------|-----------|
| `@shield *audit` | Auditoria passiva completa |
| `@shield *quick-check` | Check rapido: headers, CORS, OpenAPI |
| `@shield *rls-audit` | Auditoria focada em RLS |
| `@shield *triage` | Priorizar findings por severidade |
| `@shield *roadmap` | Gerar roadmap de remediacao com estimativas |
| `@shield *report` | Gerar relatorio consolidado |
| `@shield *fix {finding}` | Gerar codigo de correcao para um finding |
| `@shield *status` | Status da auditoria atual |

---

### Tier 1: Minds (Especialistas)

#### @rls-guardian — RLS & Access Control

Especialista em Row Level Security do Supabase. Cobre a causa raiz de 60%+ dos findings CRITICAL.

| Comando | O que faz |
|---------|-----------|
| `@rls-guardian *audit-rls` | Auditoria completa de RLS a partir de SQL dump ou migrations |
| `@rls-guardian *check-tables` | Verificar quais tabelas tem RLS habilitado/desabilitado |
| `@rls-guardian *check-rpcs` | Validar auth checks em funcoes RPC |
| `@rls-guardian *generate-fix` | Gerar SQL de correcao para tabela especifica |
| `@rls-guardian *patterns` | Mostrar patterns comuns de vulnerabilidades RLS |

#### @config-sentinel — Security Configuration

Especialista em misconfiguracoes: CORS, headers, OpenAPI, PostgREST hints.

| Comando | O que faz |
|---------|-----------|
| `@config-sentinel *audit-cors` | Verificar configuracao CORS |
| `@config-sentinel *audit-headers` | Analisar security headers HTTP |
| `@config-sentinel *audit-openapi` | Verificar exposicao de OpenAPI/schema |
| `@config-sentinel *audit-hints` | Verificar PostgREST hints |
| `@config-sentinel *audit-all` | Rodar todos os checks de configuracao |
| `@config-sentinel *baseline` | Comparar contra baseline de seguranca |

#### @auth-inspector — Authentication & Authorization

Especialista em fluxos de autenticacao, rate limiting, JWT e RBAC.

| Comando | O que faz |
|---------|-----------|
| `@auth-inspector *review-auth` | Revisao completa do fluxo de autenticacao |
| `@auth-inspector *check-rate-limit` | Verificar rate limiting |
| `@auth-inspector *check-signup` | Auditar configuracao de signup/registro |
| `@auth-inspector *check-passwords` | Revisar politica de senhas |
| `@auth-inspector *check-jwt` | Analisar configuracao JWT |
| `@auth-inspector *check-rbac` | Revisar controle de acesso baseado em roles |

#### @compliance-advisor — LGPD & Privacy

Especialista em conformidade com a LGPD e protecao de dados pessoais.

| Comando | O que faz |
|---------|-----------|
| `@compliance-advisor *scan-pii` | Identificar PII exposta em tabelas/APIs |
| `@compliance-advisor *check-lgpd` | Avaliacao de conformidade LGPD |
| `@compliance-advisor *check-consent` | Verificar mecanismos de consentimento |
| `@compliance-advisor *assess-breach` | Avaliar se incidente requer notificacao ANPD |
| `@compliance-advisor *anpd-report` | Gerar rascunho de notificacao para ANPD |
| `@compliance-advisor *data-map` | Mapear fluxos de dados pessoais |

---

### Tier 2: Tools (Operacionais)

#### @header-analyzer — HTTP Headers

| Comando | O que faz |
|---------|-----------|
| `@header-analyzer *analyze` | Analisar headers de seguranca de uma URL |
| `@header-analyzer *compare` | Comparar headers contra baseline |
| `@header-analyzer *fix` | Gerar configuracao de correcao |

#### @schema-reviewer — Schema Exposure

| Comando | O que faz |
|---------|-----------|
| `@schema-reviewer *analyze` | Analisar OpenAPI schema exposto |
| `@schema-reviewer *check-exposure` | Verificar o que esta exposto publicamente |
| `@schema-reviewer *fix` | Gerar fix para reduzir exposicao |

#### @policy-validator — RLS Policy Validation

| Comando | O que faz |
|---------|-----------|
| `@policy-validator *validate` | Validar policies RLS em SQL |
| `@policy-validator *check-coverage` | Verificar cobertura de policies por tabela |
| `@policy-validator *detect-gaps` | Detectar gaps nas policies |

#### @fix-generator — Remediation Code

| Comando | O que faz |
|---------|-----------|
| `@fix-generator *fix-sql {finding}` | Gerar SQL fix (RLS, auth checks) |
| `@fix-generator *fix-vercel {finding}` | Gerar vercel.json fix (headers, CORS) |
| `@fix-generator *fix-supabase {finding}` | Gerar fix de config Supabase |
| `@fix-generator *fix-cors {dominios}` | Gerar config de restricao CORS |
| `@fix-generator *fix-all {findings}` | Gerar todos os fixes de uma vez |

---

### Tier 3: Blue Team

#### @sentinel — Threat Hunting & Log Analysis

Especialista em deteccao de ameacas, analise de logs e criacao de regras de deteccao.

| Comando | O que faz |
|---------|-----------|
| `@sentinel *hunt` | Iniciar sessao de threat hunting |
| `@sentinel *logs` | Analisar logs em busca de anomalias |
| `@sentinel *triage` | Triagem de alerta ou indicador |
| `@sentinel *baseline` | Estabelecer baseline de comportamento normal |
| `@sentinel *detect` | Criar regra de deteccao (Sigma/YARA) |
| `@sentinel *investigate` | Investigar indicador suspeito |
| `@sentinel *ioc-check` | Verificar indicadores de comprometimento |
| `@sentinel *report` | Gerar relatorio de investigacao |

**Frameworks:** MITRE ATT&CK, Sigma rules, YARA, threat intelligence.

#### @watchdog — Security Posture & Incident Response

Especialista em avaliacao de postura, hardening e planejamento de resposta a incidentes.

| Comando | O que faz |
|---------|-----------|
| `@watchdog *posture` | Avaliar postura de seguranca geral |
| `@watchdog *hardening` | Recomendacoes de hardening |
| `@watchdog *ir-plan` | Criar plano de resposta a incidentes |
| `@watchdog *nist` | Avaliar contra NIST Cybersecurity Framework |
| `@watchdog *cis` | Verificar CIS Controls basicos |
| `@watchdog *backup` | Avaliar estrategia de backup |
| `@watchdog *access` | Revisar controles de acesso |
| `@watchdog *compliance` | Verificar compliance basico |

**Frameworks:** NIST CSF, NIST SP 800-61, CIS Controls.

#### @code-guardian — OWASP Code Review & Secrets Detection

Especialista em revisao de codigo com foco em seguranca, deteccao de secrets e auditoria de dependencias.

| Comando | O que faz |
|---------|-----------|
| `@code-guardian *review` | Code review de seguranca |
| `@code-guardian *owasp` | Verificar contra OWASP Top 10 |
| `@code-guardian *secrets` | Buscar secrets expostos no codigo |
| `@code-guardian *deps` | Auditar dependencias vulneraveis |
| `@code-guardian *fix` | Mostrar como corrigir uma vulnerabilidade |
| `@code-guardian *checklist` | Checklist de seguranca para codigo |
| `@code-guardian *hardening` | Recomendacoes de hardening para o app |
| `@code-guardian *headers` | Verificar security headers HTTP |

**Frameworks:** OWASP Top 10 (2021), OWASP ASVS, CWE.

---

## Workflows

### 1. Full Audit (`@shield *audit`)

Pipeline completo de auditoria:

```
Inventario -> Scan Passivo -> Revisao Profunda -> Compliance LGPD -> Remediacao -> Relatorio
```

Usa todos os agentes dos Tiers 1 e 2. Tempo estimado: 1-3 horas.

### 2. RLS Audit (`@shield *rls-audit`)

Focado em Supabase:

```
Enumerar Tabelas -> Validar Policies -> Coverage Matrix -> Gerar Fixes SQL
```

Usa `@rls-guardian` e `@policy-validator`. Tempo estimado: 30-60 minutos.

### 3. Quick Check (`@shield *quick-check`)

Check rapido:

```
Headers HTTP -> CORS -> OpenAPI -> Resumo com Quick Wins
```

Usa `@header-analyzer` e `@config-sentinel`. Tempo estimado: ~10 minutos.

---

## Checklists Incluidas

| Checklist | Arquivo | Cobre |
|-----------|---------|-------|
| **Supabase Security Baseline** | `supabase-security-baseline.md` | RLS, RPCs, auth config, API exposure |
| **Vercel Security Config** | `vercel-security-config.md` | Headers, CORS, env vars, deployment settings |
| **LGPD Compliance** | `lgpd-compliance.md` | Artigos 6, 7, 11, 18, 46, 48 da LGPD |
| **Pre-Deploy Security Gate** | `pre-deploy-security.md` | Checklist obrigatorio antes de deploy |
| **Security Baseline** | `security-baseline.md` | Baseline geral: OS, rede, app, contas, backup |

---

## Top 10 Vulnerabilidades Cobertas

Patterns extraidos de auditorias reais:

| # | Pattern | OWASP | Frequencia |
|---|---------|-------|-----------|
| 1 | RLS desabilitado em tabelas com PII | A01 | 100% das apps |
| 2 | RPCs sem verificacao de autorizacao | A01 | 67% das apps |
| 3 | CORS wildcard (`*`) | A05 | 100% das apps |
| 4 | OpenAPI schema exposto publicamente | A05 | 67% das apps |
| 5 | Signup aberto com auto-confirm | A07 | 67% das apps |
| 6 | Zero rate limiting em auth | A07 | 67% das apps |
| 7 | Security headers ausentes | A05 | 100% das apps |
| 8 | PII vazando em rankings/views publicas | A01 | 67% das apps |
| 9 | Policies de escrita incompletas (INSERT/UPDATE) | A01 | 67% das apps |
| 10 | PostgREST hints habilitados | A05 | 67% das apps |

---

## Stack Alvo

Otimizado para apps construidas com:

| Tecnologia | Camada |
|-----------|--------|
| **Supabase** | Auth, Database, PostgREST, Realtime |
| **Vercel** | Hosting, Edge Functions, Middleware |
| **React / Next.js** | Frontend SPA |
| **PostgreSQL** | RLS, Functions, Policies |

Os principios e agentes do Tier 3 (Blue Team) se aplicam a **qualquer stack web**.

---

## Conteudo do Squad

| Componente | Qtd | Detalhes |
|-----------|-----|---------|
| Agents | 12 | 1 orchestrador + 4 minds + 4 tools + 3 blue team |
| Tasks | 38 | Cobrindo todos os agentes |
| Workflows | 3 | full-audit, rls-audit, quick-check |
| Checklists | 5 | supabase, vercel, lgpd, pre-deploy, security-baseline |
| Vulnerability Patterns | 10 | Extraidos de auditorias reais |
| Templates | 1 | Relatorio de auditoria padronizado |

---

## Exemplos de Uso

### Auditar uma app Supabase rapidamente

```
@shield *quick-check

# Forneca a URL da aplicacao quando solicitado
# Em ~10 min voce tera um resumo com os problemas mais urgentes
```

### Verificar se todas as tabelas tem RLS

```
@rls-guardian *check-tables

# Passe o SQL dump ou migrations
# O agente lista cada tabela e seu status de RLS
```

### Gerar fix de CORS para dominios especificos

```
@fix-generator *fix-cors meuapp.com,staging.meuapp.com

# Gera a config pronta para vercel.json ou Supabase
```

### Iniciar threat hunting nos logs

```
@sentinel *hunt

# O agente guia voce pelo ciclo:
# Hipotese -> Coletar Dados -> Analisar -> Concluir -> Documentar
```

### Avaliar postura de seguranca com NIST

```
@watchdog *nist

# Avaliacao contra as 5 funcoes do NIST CSF:
# Identify -> Protect -> Detect -> Respond -> Recover
```

### Buscar secrets no codigo

```
@code-guardian *secrets

# Varre o codebase procurando API keys, passwords, tokens hardcoded
```

### Verificar compliance LGPD

```
@compliance-advisor *check-lgpd

# Avaliacao contra artigos da LGPD
# Identifica PII exposta e gaps de conformidade
```

---

## Restricoes (NON-NEGOTIABLE)

Estas restricoes sao absolutas e aplicam-se a todos os agentes do squad:

- **NUNCA** envia requests que modificam dados no alvo
- **NUNCA** tenta bypass de autenticacao
- **NUNCA** faz brute force, fuzzing ou injection
- **NUNCA** executa exploits ou gera payloads
- **APENAS** analise passiva: configs, codigo, policies, headers, logs
- **SEMPRE** gera remediacao para cada finding encontrado
- **SEMPRE** prioriza por CVSS score e impacto no negocio

---

## Estrutura de Arquivos

```
webapp-defender/
|-- squad.yaml                    # Manifesto do squad
|-- README.md                     # Este arquivo
|-- agents/                       # 12 agentes
|   |-- shield.md                 # Orchestrador
|   |-- rls-guardian.md           # RLS specialist
|   |-- config-sentinel.md        # Config auditor
|   |-- auth-inspector.md         # Auth reviewer
|   |-- compliance-advisor.md     # LGPD advisor
|   |-- header-analyzer.md        # Header analyzer
|   |-- schema-reviewer.md        # Schema reviewer
|   |-- policy-validator.md       # Policy validator
|   |-- fix-generator.md          # Fix generator
|   |-- sentinel.md               # Threat hunter
|   |-- watchdog.md               # Posture analyst
|   |-- code-guardian.md          # Code reviewer
|-- tasks/                        # 38 tasks
|-- workflows/                    # 3 workflows
|-- checklists/                   # 5 checklists
|-- templates/                    # 1 template de relatorio
|-- config/                       # Configuracoes do squad
|-- data/                         # Vulnerability patterns
|-- scripts/                      # Scripts auxiliares
|-- tools/                        # (reservado)
```

---

## Creditos

- **Squad:** Craft (Squad Creator) + Sidney Fernandes
- **Dados de auditoria:** SAIOS Cybersecurity Division
- **Framework:** [SAIOS](https://github.com/SynkraAI/aios-core) — Security AI Orchestrated System v4.0
- **Licenca:** MIT

---

*webapp-defender v2.0.0 — Encontrar -> Explicar -> Corrigir -> Defender*
