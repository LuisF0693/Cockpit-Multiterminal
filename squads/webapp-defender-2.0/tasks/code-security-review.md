# Task: Code Security Review

**Task ID:** code-security-review
**Agent:** @shield
**Priority:** HIGH
**Tools Required:** Grep, Read, Glob (ferramentas nativas do Claude Code)

---

## Objetivo

Revisar codigo fonte para identificar vulnerabilidades de seguranca, seguindo OWASP Top 10 como referencia. Foco em **encontrar e ensinar a corrigir** — sem explorar.

> **Foco educacional:** Cada finding inclui explicacao do risco, exemplo vulneravel e exemplo corrigido.

---

## Pre-requisitos

- Acesso ao codigo fonte do projeto
- Conhecimento da linguagem/framework usado
- Opcional: resultados de `dependency-audit` para contexto

---

## Inputs

| Parametro | Descricao | Exemplo |
|-----------|-----------|---------|
| TARGET_PATH | Path do codigo | `/path/to/project` |
| LANGUAGE | Linguagem principal | `javascript`, `python`, `java`, `go` |
| FRAMEWORK | Framework usado | `react`, `nextjs`, `express`, `django`, `spring` |
| FOCUS | Area de foco (opcional) | `auth`, `api`, `input`, `all` |

---

## Workflow

### Step 1: Reconhecimento do Projeto

Entender a estrutura antes de revisar:

```markdown
## Reconhecimento
- [ ] Linguagem e framework identificados
- [ ] Estrutura de pastas mapeada
- [ ] Entry points identificados (routes, handlers, controllers)
- [ ] Dependencias de seguranca identificadas (auth libs, ORM, sanitizers)
- [ ] Configuracoes de ambiente localizadas (.env, config files)
```

### Step 2: Scan de Secrets

> "Se esta no codigo, ja foi comprometido."

**Patterns a buscar:**

| Pattern | Risco | Prioridade |
|---------|-------|------------|
| `API_KEY = "..."` | Key exposta | P0 |
| `password = "..."` | Credencial hardcoded | P0 |
| `BEGIN RSA PRIVATE KEY` | Chave privada no codigo | P0 |
| `Bearer eyJ...` | Token hardcoded | P0 |
| `.env` commitado | Secrets no git | P0 |
| `secret:` em config files | Secret em plaintext | P1 |

**Checklist de secrets:**
```markdown
- [ ] Nenhum secret hardcoded em codigo
- [ ] .env no .gitignore
- [ ] Nenhuma chave privada no repositorio
- [ ] Nenhum token/password em configs commitados
- [ ] git history limpo de secrets (trufflehog)
```

### Step 3: Review OWASP Top 10

Verificar cada categoria:

#### A01 - Broken Access Control
```markdown
- [ ] Authorization verificada server-side (nao apenas no frontend)
- [ ] Deny by default em rotas/endpoints
- [ ] Least privilege aplicado
- [ ] CORS configurado com whitelist (nao origin: '*')
- [ ] IDs de recursos nao previssiveis (UUID vs auto-increment)
- [ ] Verificacao de ownership em operacoes (user so acessa seus dados)
```

#### A02 - Cryptographic Failures
```markdown
- [ ] Senhas hasheadas com bcrypt (cost 12+) ou Argon2id
- [ ] NUNCA MD5, SHA1, SHA256 sem salt para senhas
- [ ] TLS/HTTPS obrigatorio
- [ ] Dados sensiveis criptografados at rest
- [ ] JWT com algoritmo seguro (RS256 ou ES256, nao HS256 com secret fraco)
```

#### A03 - Injection
```markdown
- [ ] Queries SQL parametrizadas (prepared statements)
- [ ] ORM usado corretamente (sem raw queries com input do usuario)
- [ ] Nenhum exec()/system() com input do usuario
- [ ] HTML sanitizado antes de render (DOMPurify ou equivalente)
- [ ] Nenhum eval() com input externo
```

#### A04 - Insecure Design
```markdown
- [ ] Rate limiting em operacoes sensiveis (login, signup, reset)
- [ ] CAPTCHA em formularios publicos
- [ ] Limites de recursos (file size, request size, timeout)
- [ ] Fail securely (erro = deny, nao allow)
```

#### A05 - Security Misconfiguration
```markdown
- [ ] Debug mode desabilitado em producao
- [ ] Stack traces nao expostos ao usuario
- [ ] Headers de seguranca configurados (CSP, X-Frame-Options, HSTS)
- [ ] Servicos desnecessarios desabilitados
- [ ] CORS restritivo
```

#### A06 - Vulnerable Components
```markdown
- [ ] Dependencias atualizadas (ver task dependency-audit)
- [ ] Nenhuma dependencia com CVE critico/alto
- [ ] Lock file commitado (package-lock.json, yarn.lock)
```

#### A07 - Authentication Failures
```markdown
- [ ] Login com rate limiting
- [ ] Password reset seguro (token temporario, nao link permanente)
- [ ] Session invalidada no logout
- [ ] Cookies com HttpOnly, Secure, SameSite
- [ ] MFA disponivel (ao menos para admins)
```

#### A08 - Software Integrity Failures
```markdown
- [ ] Dependencias de fontes confiaveis
- [ ] CI/CD pipelines protegidos
- [ ] Deploys assinados ou verificados
```

#### A09 - Logging Failures
```markdown
- [ ] Failed logins logados
- [ ] Acoes administrativas logadas
- [ ] Dados sensiveis NAO logados (senhas, tokens, PII)
- [ ] Logs protegidos contra tampering
```

#### A10 - SSRF
```markdown
- [ ] URLs de input do usuario validadas
- [ ] Whitelist de dominios permitidos para requests externos
- [ ] Requests internos (localhost, 169.254.x.x) bloqueados
```

### Step 4: Compilar Findings

Para cada finding:

```markdown
### [FINDING-ID] - [TITULO]

**Severidade:** Critical / High / Medium / Low
**OWASP:** A0X - [Categoria]
**Arquivo:** `path/to/file.ext:line`

**O que encontrei:**
[Descricao clara do problema]

**Por que e perigoso:**
[Explicacao educacional do risco]

**Codigo vulneravel:**
```[lang]
// Codigo com problema
```

**Como corrigir:**
```[lang]
// Codigo corrigido
```

**Referencia:**
- [Link para OWASP / documentacao relevante]
```

---

## Report Template

```markdown
# Code Security Review Report

**Projeto:** {{TARGET_PATH}}
**Linguagem:** {{LANGUAGE}} / {{FRAMEWORK}}
**Data:** {{DATE}}
**Analista:** @shield

## Resumo

| Severidade | Quantidade |
|------------|------------|
| Critical | X |
| High | X |
| Medium | X |
| Low | X |
| **Total** | **X** |

## Findings

### Critical
[Findings P0]

### High
[Findings P1]

### Medium
[Findings P2]

### Low
[Findings P3]

## Padroes Positivos Encontrados
[Coisas que o codigo ja faz bem - reforco positivo]

## Recomendacoes Gerais
1. ...
2. ...

## Proximos Passos
1. Corrigir findings Critical e High imediatamente
2. Rodar dependency-audit para dependencias
3. Implementar CI checks (linting de seguranca)
```

---

## Output

```
code-review-YYYYMMDD/
├── findings/
│   ├── critical.md        # Findings criticos
│   ├── high.md            # Findings altos
│   ├── medium.md          # Findings medios
│   └── low.md             # Findings baixos
├── secrets-scan.md        # Resultado do scan de secrets
├── owasp-checklist.md     # Checklist OWASP preenchido
└── REPORT.md              # Report final
```

---

## Handoff

1. **Secrets encontrados**: Acao imediata - rotacionar credenciais
2. **Vulnerabilidades de infra**: Encaminhar para @watchdog (hardening-assessment)
3. **Dependencias vulneraveis**: Encaminhar para @shield (dependency-audit)
4. **Gaps em deteccao/logging**: Encaminhar para @sentinel (log-analysis)

---

## Dicas

- Comece SEMPRE pelo scan de secrets — e o mais rapido e de maior impacto
- Injection (A03) e o mais perigoso e mais comum. Foque nisso primeiro
- Nao precisa memorizar tudo — use o checklist como guia
- Quando encontrar um problema, SEMPRE mostre como corrigir
- Um codigo que "funciona" nao significa que e seguro
- Consulte a OWASP Cheat Sheet Series para exemplos detalhados

---

*Task Version: 1.0*
*Created: 2026-02-16*
