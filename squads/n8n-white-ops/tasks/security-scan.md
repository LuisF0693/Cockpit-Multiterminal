---
task: security-scan
responsavel: "@n8n-security"
responsavel_type: agent
atomic_layer: task
Entrada: |
  - workflow_id: ID do workflow n8n (required)
Saida: |
  - Relatório de segurança com findings, severidades e remediações
Checklist:
  - "[ ] Rodar POST /audit como baseline (categories: credentials, database, nodes, instance)"
  - "[ ] Buscar workflow via API"
  - "[ ] Scan de secrets em Code nodes"
  - "[ ] Verificar webhooks sem autenticação"
  - "[ ] Verificar SQL injection em nodes de banco"
  - "[ ] Verificar dados sensíveis expostos"
  - "[ ] Verificar permissões de credenciais"
  - "[ ] Verificar sub-workflow access control (callerPolicy)"
  - "[ ] Verificar loop resource exhaustion"
  - "[ ] Verificar MCP exposure (availableInMCP)"
  - "[ ] Classificar findings por severidade"
  - "[ ] Gerar relatório com remediações"
---

# Security Scan

**Task for:** @n8n-security (n8n-ops squad)

## Overview

Executa scan de segurança em um workflow n8n buscando credenciais expostas, webhooks sem autenticação, SQL injection e dados sensíveis.

## Usage

```
@n8n-ops/n8n-security
*scan J2pjLqBiMEU6Nq54
```

## Categorias de Scan

### 1. Secrets Hardcoded
Buscar em `node.parameters` de Code nodes:
- API keys, tokens, passwords em strings
- JWT tokens (padrão `eyJ...`)
- Stripe keys (`sk_live_`, `pk_live_`)

### 2. Webhooks Abertos
Para cada node `webhook`:
- `authentication === "none"` → CRÍTICO se ativo
- Path previsível (ex: `/webhook/test`) → ALTO

### 3. SQL Injection
Para nodes `postgres`, `mysql`:
- Query com `{{ $json.xxx }}` sem sanitização → MÉDIO
- Verificar se usa parameterized queries

### 4. Dados Sensíveis
- PII em logs (Code nodes com console.log)
- Dados de cartão sem masking
- CPF/email expostos em variáveis sem proteção

### 5. Credenciais
- Mesma credencial admin em múltiplos workflows
- Credenciais com escopo excessivo

### 6. Flow Logic Security
- Sub-workflow: `callerPolicy` configurado? (`any` → MÉDIO, ausente + dados sensíveis → ALTO)
- Loops: exit condition presente? (sem → ALTO: CPU exhaustion)
- Loops: HTTP sem rate limiting (Wait)? (→ MÉDIO: ban de IP)
- Branches: auth bypass por dead branch ou merge de branch autenticada + não-autenticada? (→ CRÍTICO)
- MCP: `availableInMCP: true` sem webhook auth? (→ CRÍTICO)

## Related

- **Agent:** @n8n-security
- **Complementar:** audit-workflow (para saúde geral)
