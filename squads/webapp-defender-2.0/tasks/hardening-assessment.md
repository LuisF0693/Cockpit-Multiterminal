# Task: Hardening Assessment

**Task ID:** hardening-assessment
**Agent:** @watchdog
**Priority:** MEDIUM
**Tools Required:** Bash, Read, Grep (ferramentas nativas do Claude Code)

---

## Objetivo

Avaliar o nivel de hardening de um sistema (servidor, aplicacao, rede) e gerar recomendacoes praticas de melhoria. Baseado em CIS Benchmarks e melhores praticas da industria.

> **Foco educacional:** Cada recomendacao explica o *risco* de nao implementar e o *como* implementar passo a passo.

---

## Pre-requisitos

- Acesso ao sistema alvo (SSH, console, ou informacoes de configuracao)
- Conhecimento do tipo de sistema (Linux, Windows, cloud, container)
- Opcional: resultados de security-posture-check para contexto

---

## Inputs

| Parametro | Descricao | Exemplo |
|-----------|-----------|---------|
| TARGET_TYPE | Tipo do sistema | `linux-server`, `windows-server`, `web-app`, `database`, `cloud`, `container` |
| TARGET_OS | Sistema operacional | `ubuntu-22.04`, `centos-8`, `windows-2022` |
| TARGET_ROLE | Funcao do sistema | `web-server`, `db-server`, `api-server`, `workstation` |
| BENCHMARK | Benchmark de referencia | `cis`, `stig`, `custom` |

---

## Workflow

### Step 1: Coleta de Informacoes

```markdown
## System Information
- [ ] OS e versao identificados
- [ ] Funcao/role do sistema documentada
- [ ] Servicos em execucao listados
- [ ] Portas abertas mapeadas
- [ ] Usuarios e grupos catalogados
- [ ] Software instalado listado
- [ ] Configuracoes de rede coletadas
```

**Comandos de coleta (Linux):**

```bash
# Informacoes do sistema
uname -a
cat /etc/os-release

# Servicos ativos
systemctl list-units --type=service --state=running

# Portas abertas
ss -tlnp

# Usuarios com shell
grep -v '/nologin\|/false' /etc/passwd

# Grupos com membros
getent group | awk -F: '$4 != ""'

# Software instalado (Debian/Ubuntu)
dpkg -l | grep "^ii"

# Configuracao de rede
ip addr show
ip route show
cat /etc/resolv.conf
```

### Step 2: Hardening - Sistema Operacional

#### 2a. Updates e Patches

```markdown
## Updates & Patches

| Check | Status | Detalhes |
|-------|--------|----------|
| OS atualizado | ⬜ | |
| Security patches em dia | ⬜ | |
| Auto-update configurado | ⬜ | |
| Reboot pendente | ⬜ | |
```

**Verificacao (Linux):**
```bash
# Updates pendentes (Ubuntu/Debian)
apt list --upgradable 2>/dev/null

# Security updates (Ubuntu)
apt list --upgradable 2>/dev/null | grep -i security

# Reboot pendente
[ -f /var/run/reboot-required ] && echo "REBOOT NEEDED" || echo "OK"
```

**Por que importa:** Vulnerabilidades conhecidas sao as mais exploradas. Patches fecham essas portas.

#### 2b. Servicos e Processos

```markdown
## Servicos Minimizados

| Check | Status | Detalhes |
|-------|--------|----------|
| Apenas servicos necessarios rodando | ⬜ | |
| Servicos desnecessarios desabilitados | ⬜ | |
| Nenhum servico legacy (telnet, ftp, rsh) | ⬜ | |
| Servicos rodando com usuario adequado (nao root) | ⬜ | |
```

**Verificacao:**
```bash
# Servicos que NAO deveriam estar rodando
systemctl is-active telnet.socket ftp vsftpd rsh xinetd 2>/dev/null

# Processos rodando como root
ps aux | awk '$1 == "root" {print $11}' | sort -u

# Servicos habilitados no boot
systemctl list-unit-files --state=enabled --type=service
```

**Por que importa:** Cada servico rodando e uma superficie de ataque. Menos servicos = menos risco.

#### 2c. Autenticacao e Acesso

```markdown
## Authentication & Access

| Check | Status | Detalhes |
|-------|--------|----------|
| SSH: key-based auth only | ⬜ | |
| SSH: root login desabilitado | ⬜ | |
| SSH: porta padrao alterada (opcional) | ⬜ | |
| Password policy configurada | ⬜ | |
| Contas inativas desabilitadas | ⬜ | |
| sudo configurado (nao usar root direto) | ⬜ | |
| MFA habilitado para acesso admin | ⬜ | |
| Conta guest desabilitada | ⬜ | |
```

**Verificacao SSH:**
```bash
# Verificar config SSH
grep -E "^(PermitRootLogin|PasswordAuthentication|PubkeyAuthentication|Port)" /etc/ssh/sshd_config

# Recomendado:
# PermitRootLogin no
# PasswordAuthentication no
# PubkeyAuthentication yes
```

**Por que importa:** SSH com password e o alvo #1 de brute force. Key-based auth elimina esse vetor.

#### 2d. Firewall

```markdown
## Firewall

| Check | Status | Detalhes |
|-------|--------|----------|
| Firewall ativo | ⬜ | |
| Default policy: deny | ⬜ | |
| Apenas portas necessarias abertas | ⬜ | |
| Regras documentadas | ⬜ | |
| Logging de firewall ativo | ⬜ | |
```

**Verificacao (Linux):**
```bash
# UFW (Ubuntu)
ufw status verbose

# iptables
iptables -L -n -v

# firewalld (CentOS/RHEL)
firewall-cmd --list-all
```

#### 2e. Filesystem e Permissoes

```markdown
## Filesystem & Permissions

| Check | Status | Detalhes |
|-------|--------|----------|
| Arquivos SUID/SGID revisados | ⬜ | |
| World-writable files minimizados | ⬜ | |
| /tmp com noexec (se possivel) | ⬜ | |
| Log files com permissoes restritas | ⬜ | |
| Sensitive files protegidos (shadow, sudoers) | ⬜ | |
```

**Verificacao:**
```bash
# Arquivos SUID (potencial de escalacao)
find / -perm -4000 -type f 2>/dev/null

# Arquivos SGID
find / -perm -2000 -type f 2>/dev/null

# World-writable files
find / -xdev -perm -0002 -type f 2>/dev/null

# Permissoes de arquivos sensiveis
ls -la /etc/shadow /etc/sudoers /etc/ssh/sshd_config
```

### Step 3: Hardening - Rede

```markdown
## Network Hardening

| Check | Status | Detalhes |
|-------|--------|----------|
| Segmentacao de rede | ⬜ | |
| DNS filtrado | ⬜ | |
| IPv6 desabilitado (se nao usado) | ⬜ | |
| IP forwarding desabilitado (se nao router) | ⬜ | |
| ICMP redirect desabilitado | ⬜ | |
| TCP SYN cookies habilitado | ⬜ | |
```

**Verificacao (sysctl):**
```bash
# Kernel network parameters
sysctl net.ipv4.ip_forward
sysctl net.ipv4.conf.all.accept_redirects
sysctl net.ipv4.tcp_syncookies
sysctl net.ipv6.conf.all.disable_ipv6
```

### Step 4: Hardening - Logging e Monitoramento

```markdown
## Logging & Monitoring

| Check | Status | Detalhes |
|-------|--------|----------|
| Syslog/journald funcionando | ⬜ | |
| Auth logs ativos | ⬜ | |
| Log rotation configurado | ⬜ | |
| Logs centralizados (opcional) | ⬜ | |
| Auditd/audit framework ativo | ⬜ | |
| NTP sincronizado (timestamps corretos) | ⬜ | |
| fail2ban ou similar ativo | ⬜ | |
```

**Verificacao:**
```bash
# Rsyslog/journald
systemctl is-active rsyslog systemd-journald

# Log rotation
ls /etc/logrotate.d/

# Auditd
systemctl is-active auditd

# NTP
timedatectl status

# fail2ban
systemctl is-active fail2ban
fail2ban-client status 2>/dev/null
```

### Step 5: Calcular Score e Priorizar

**Scoring por area:**

| Area | Peso | Score (0-10) |
|------|------|-------------|
| Updates & Patches | 15% | /10 |
| Servicos Minimizados | 10% | /10 |
| Autenticacao & Acesso | 20% | /10 |
| Firewall | 15% | /10 |
| Filesystem & Permissoes | 10% | /10 |
| Network | 10% | /10 |
| Logging & Monitoramento | 15% | /10 |
| Backup & Recovery | 5% | /10 |
| **Score Ponderado** | **100%** | **/10** |

**Classificacao:**
- 9-10: Excelente (hardened)
- 7-8: Bom (melhorias menores)
- 5-6: Aceitavel (gaps significativos)
- 3-4: Fraco (risco alto)
- 0-2: Critico (acao imediata necessaria)

---

## Report Template

```markdown
# Hardening Assessment Report

**Sistema:** {{TARGET_TYPE}} ({{TARGET_OS}})
**Role:** {{TARGET_ROLE}}
**Benchmark:** {{BENCHMARK}}
**Data:** {{DATE}}
**Analista:** @watchdog

## Executive Summary

**Score geral:** X/10 — [Classificacao]

| Area | Score | Status |
|------|-------|--------|
| Updates | X/10 | ⬜ |
| Servicos | X/10 | ⬜ |
| Autenticacao | X/10 | ⬜ |
| Firewall | X/10 | ⬜ |
| Filesystem | X/10 | ⬜ |
| Network | X/10 | ⬜ |
| Logging | X/10 | ⬜ |

## Top Recommendations

### Imediato (P0)
1. [Recomendacao + comando para implementar]

### Curto prazo (P1)
1. [Recomendacao + comando para implementar]

### Medio prazo (P2)
1. [Recomendacao + comando para implementar]

## Detalhamento por Area
[Checklists preenchidos com findings]
```

---

## Output

```
hardening-YYYYMMDD/
├── system-info.md         # Informacoes coletadas
├── os-hardening.md        # Avaliacao do OS
├── network-hardening.md   # Avaliacao de rede
├── logging-hardening.md   # Avaliacao de logging
├── score-summary.md       # Score e classificacao
└── REPORT.md              # Report final com recomendacoes
```

---

## Handoff

1. **Gaps em codigo/app**: Encaminhar para @shield (code-security-review)
2. **Gaps em deteccao**: Encaminhar para @sentinel (log-analysis)
3. **Postura geral**: Alimentar @watchdog (security-posture-check)
4. **Implementacao de fixes**: SysAdmin/DevOps executa

---

## Dicas

- Hardening nao e "instalar ferramenta" — e remover o desnecessario e proteger o necessario
- Comece pelos basicos: updates, SSH, firewall. Isso ja resolve 80% dos riscos
- Cada sistema e diferente — adapte o checklist ao contexto
- Nao desabilite algo sem entender o que faz (especialmente em producao)
- Teste mudancas em ambiente de teste ANTES de aplicar em producao
- "Secure by default" e o objetivo — cada desvio precisa de justificativa
- Documente TUDO que mudar — hardening sem documentacao vira problema futuro

---

*Task Version: 1.0*
*Created: 2026-02-16*
