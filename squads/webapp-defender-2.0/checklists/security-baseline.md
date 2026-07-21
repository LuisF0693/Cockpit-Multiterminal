# Checklist: Security Baseline

Checklist minimo de seguranca para avaliar qualquer ambiente. Baseado em NIST CSF, CIS Controls e OWASP.

> **Como usar:** Preencha cada item com ✅ (ok), 🟡 (parcial) ou ❌ (ausente). Some os pontos no final para ter seu score.

---

## Quick Assessment

| Area | Status | Responsavel | Notas |
|------|--------|-------------|-------|
| Autenticacao | ⬜ | | |
| Controle de Acesso | ⬜ | | |
| Validacao de Input | ⬜ | | |
| Secrets | ⬜ | | |
| Dependencias | ⬜ | | |
| Hardening | ⬜ | | |
| Logging | ⬜ | | |
| Backup | ⬜ | | |
| Rede | ⬜ | | |
| Resposta a Incidentes | ⬜ | | |

---

## 1. Autenticacao (15 pts)

> Agente de referencia: @shield

### Senhas
- [ ] (2pts) Senhas hasheadas com bcrypt (cost 12+) ou Argon2id
- [ ] (1pt) Minimo 8 caracteres (12+ recomendado)
- [ ] (1pt) Rate limiting em login (max 5 tentativas/minuto)
- [ ] (1pt) Account lockout apos tentativas excessivas

### Sessoes
- [ ] (2pts) Session ID regenerado apos login
- [ ] (1pt) Cookies com flags: `HttpOnly`, `Secure`, `SameSite=Strict`
- [ ] (1pt) Session timeout configurado (idle e absolute)
- [ ] (1pt) Logout invalida session server-side

### MFA
- [ ] (2pts) MFA habilitado para contas admin/privilegiadas
- [ ] (1pt) MFA disponivel para todos usuarios
- [ ] (1pt) Recovery codes seguros e armazenados
- [ ] (1pt) MFA nao depende apenas de SMS (prefira TOTP/WebAuthn)

**Subtotal: ___/15**

---

## 2. Controle de Acesso (10 pts)

> Agente de referencia: @shield, @watchdog

- [ ] (2pts) Authorization verificada SERVER-SIDE em cada request
- [ ] (2pts) Deny by default (whitelist, nao blacklist)
- [ ] (2pts) Least privilege aplicado a todos usuarios e servicos
- [ ] (1pt) RBAC ou ABAC implementado consistentemente
- [ ] (1pt) Revisao periodica de acessos documentada
- [ ] (1pt) Contas compartilhadas eliminadas
- [ ] (1pt) Offboarding remove acessos imediatamente

**Subtotal: ___/10**

---

## 3. Validacao de Input (10 pts)

> Agente de referencia: @shield

- [ ] (2pts) Toda entrada validada server-side (nao depender do frontend)
- [ ] (2pts) SQL queries parametrizadas (prepared statements)
- [ ] (2pts) Output encoding context-aware (HTML, JS, URL)
- [ ] (1pt) Whitelist validation (nao blacklist)
- [ ] (1pt) Type checking e length limits em todos campos
- [ ] (1pt) File upload com whitelist de extensoes + magic bytes
- [ ] (1pt) Nenhum exec()/eval() com input do usuario

**Subtotal: ___/10**

---

## 4. Gestao de Secrets (10 pts)

> Agente de referencia: @shield

- [ ] (3pts) NENHUM secret hardcoded no codigo
- [ ] (2pts) `.env` no `.gitignore` (nunca commitado)
- [ ] (2pts) Secrets via environment variables ou secrets manager
- [ ] (1pt) Git history limpo de secrets (verificar com trufflehog/gitleaks)
- [ ] (1pt) API keys e tokens rotacionaveis
- [ ] (1pt) JWT secrets com 256+ bits de entropia

**Subtotal: ___/10**

---

## 5. Dependencias (10 pts)

> Agente de referencia: @shield (task: dependency-audit)

- [ ] (2pts) Zero vulnerabilidades critical nas dependencias
- [ ] (2pts) Zero vulnerabilidades high nas dependencias
- [ ] (2pts) Lock file commitado (package-lock.json, yarn.lock, etc.)
- [ ] (1pt) npm audit / pip-audit no CI/CD pipeline
- [ ] (1pt) Dependabot ou Renovate habilitado
- [ ] (1pt) Dependencias atualizadas (nenhuma major version atrasada >1 ano)
- [ ] (1pt) Nenhuma dependencia deprecated em uso

**Subtotal: ___/10**

---

## 6. Hardening de Sistema (15 pts)

> Agente de referencia: @watchdog (task: hardening-assessment)

### OS/Server
- [ ] (2pts) Sistema operacional atualizado com patches de seguranca
- [ ] (1pt) Apenas servicos necessarios rodando
- [ ] (1pt) SSH com key-based auth (password auth desabilitado)
- [ ] (1pt) Root login via SSH desabilitado
- [ ] (1pt) fail2ban ou equivalente ativo

### Firewall
- [ ] (2pts) Firewall ativo com default deny
- [ ] (1pt) Apenas portas necessarias expostas
- [ ] (1pt) Portas admin (SSH, RDP) nao acessiveis publicamente

### Web/App
- [ ] (1pt) HTTPS obrigatorio (redirect HTTP → HTTPS)
- [ ] (1pt) HSTS habilitado
- [ ] (1pt) Security headers configurados (CSP, X-Frame-Options, nosniff)
- [ ] (1pt) Debug mode desabilitado em producao
- [ ] (1pt) Stack traces nao expostos ao usuario

**Subtotal: ___/15**

---

## 7. Logging e Monitoramento (10 pts)

> Agente de referencia: @sentinel (task: log-analysis)

### Eventos logados
- [ ] (2pts) Failed logins logados com IP e timestamp
- [ ] (1pt) Acoes administrativas logadas
- [ ] (1pt) Alteracoes de privilegio logadas
- [ ] (1pt) Dados sensiveis NAO presentes nos logs (senhas, tokens, PII)

### Infraestrutura de logs
- [ ] (1pt) Logs centralizados (nao apenas local)
- [ ] (1pt) Log rotation configurado
- [ ] (1pt) Logs retidos por 90+ dias
- [ ] (1pt) Logs protegidos contra tampering
- [ ] (1pt) NTP sincronizado (timestamps confiaveis)

**Subtotal: ___/10**

---

## 8. Backup e Recovery (10 pts)

> Agente de referencia: @watchdog

### Backup (Regra 3-2-1)
- [ ] (2pts) Backup automatico configurado e funcionando
- [ ] (2pts) Restore TESTADO regularmente (backup nao testado nao e backup)
- [ ] (1pt) 3 copias dos dados
- [ ] (1pt) 2 tipos de midia diferentes
- [ ] (1pt) 1 copia offsite/cloud

### Recovery
- [ ] (1pt) Backup criptografado
- [ ] (1pt) Tempo de recuperacao (RTO) definido e documentado
- [ ] (1pt) Alertas de falha de backup configurados

**Subtotal: ___/10**

---

## 9. Seguranca de Rede (10 pts)

> Agente de referencia: @watchdog

- [ ] (2pts) Segmentacao de rede implementada
- [ ] (2pts) VPN para acesso remoto administrativo
- [ ] (1pt) Wi-Fi com WPA3 ou WPA2-Enterprise
- [ ] (1pt) DNS filtrado (bloquear dominios maliciosos)
- [ ] (1pt) TLS 1.2+ apenas (TLS 1.0/1.1 desabilitado)
- [ ] (1pt) Certificados SSL validos e nao expirados
- [ ] (1pt) Databases nao expostas publicamente
- [ ] (1pt) CORS configurado com whitelist de origins

**Subtotal: ___/10**

---

## 10. Resposta a Incidentes (10 pts)

> Agente de referencia: @watchdog, @sentinel

### Preparacao
- [ ] (2pts) Plano de resposta a incidentes documentado
- [ ] (1pt) Equipe de resposta definida com contatos
- [ ] (1pt) Playbooks para cenarios comuns (ransomware, breach, DDoS)
- [ ] (1pt) Comunicacao pre-definida (quem avisar, como avisar)

### Capacidade
- [ ] (2pts) Ferramentas de investigacao disponiveis e testadas
- [ ] (1pt) Capacidade de isolar sistemas comprometidos
- [ ] (1pt) Processo de escalacao definido
- [ ] (1pt) Post-mortem template pronto

**Subtotal: ___/10**

---

## Score Final

| # | Area | Max | Score |
|---|------|-----|-------|
| 1 | Autenticacao | 15 | /15 |
| 2 | Controle de Acesso | 10 | /10 |
| 3 | Validacao de Input | 10 | /10 |
| 4 | Secrets | 10 | /10 |
| 5 | Dependencias | 10 | /10 |
| 6 | Hardening | 15 | /15 |
| 7 | Logging | 10 | /10 |
| 8 | Backup | 10 | /10 |
| 9 | Rede | 10 | /10 |
| 10 | Resposta a Incidentes | 10 | /10 |
| | **TOTAL** | **110** | **/110** |

---

## Classificacao

| Score | Nivel | Acao |
|-------|-------|------|
| 95-110 | 🟢 Excelente | Manter e melhorar continuamente |
| 80-94 | 🟢 Bom | Melhorias pontuais necessarias |
| 65-79 | 🟡 Aceitavel | Gaps significativos, planejar melhorias |
| 45-64 | 🟠 Fraco | Riscos altos, priorizar correcoes |
| 25-44 | 🔴 Critico | Acao imediata, risco iminente |
| 0-24 | ⚫ Emergencial | Parar tudo e corrigir AGORA |

---

## Como Usar Este Checklist

### Como preencher:
1. **Comece pelo Quick Assessment** — tenha uma visao geral rapida
2. **Preencha cada secao** — marque ✅, 🟡 ou ❌
3. **Calcule o score** — some os pontos de cada item marcado como ✅ (pontos completos) ou 🟡 (metade dos pontos)
4. **Priorize gaps** — foque nas areas com menor score
5. **Repita periodicamente** — seguranca nao e um estado, e um processo

### Para usar com os agentes do Blue Team:
- **@sentinel** pode ajudar com secoes 7 (Logging) e 10 (Incidentes)
- **@shield** pode ajudar com secoes 1-5 (Auth, Access, Input, Secrets, Deps)
- **@watchdog** pode ajudar com secoes 6, 8, 9, 10 (Hardening, Backup, Rede, IR)

### Para comparar evolucao:
- Salve o score de cada avaliacao com a data
- Compare mes a mes para medir progresso
- Meta: subir pelo menos 1 nivel de classificacao por trimestre

---

*Checklist Version: 1.0*
*Created: 2026-02-16*
